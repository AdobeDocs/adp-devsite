import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  END_MARKER,
  START_MARKER,
  readSummaryBlock,
  replacePlaywrightBlock,
  updatePullRequestBody,
  validateSummaryBlock,
} from './update-playwright-pr-body.mjs';

const headSha = 'abc1234567890abc1234567890abc1234567890a';
const mergeSha = '1111111111111111111111111111111111111111';
const summary = `${START_MARKER}\n## Playwright test results\n\nNew results\n${END_MARKER}`;
const oldSummary = `${START_MARKER}\nOld results\n${END_MARKER}`;
const validEnvironment = {
  GITHUB_TOKEN: 'test-token',
  GITHUB_REPOSITORY: 'AdobeDocs/adp-devsite',
  PR_NUMBER: '123',
  GITHUB_SHA: mergeSha,
  PR_HEAD_SHA: headSha,
  GITHUB_API_URL: 'https://github.example.test/api/v3',
};

async function withSummaryFile(callback, contents = summary) {
  const directory = await mkdtemp(path.join(tmpdir(), 'playwright-pr-body-'));
  const summaryPath = path.join(directory, 'playwright-summary.md');
  try {
    await writeFile(summaryPath, contents, 'utf8');
    return await callback(summaryPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function mockResponse(data, { status = 200, statusText = 'OK' } = {}) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async json() {
      return JSON.parse(text);
    },
    async text() {
      return text;
    },
  };
}

test('appends one summary block while preserving the original body', () => {
  assert.equal(
    replacePlaywrightBlock('Author text', summary),
    `Author text\n\n${summary}`,
  );
  assert.equal(replacePlaywrightBlock('', summary), summary);
  assert.equal(replacePlaywrightBlock(null, summary), summary);
  assert.equal(
    replacePlaywrightBlock('Author text\n', summary),
    `Author text\n\n${summary}`,
  );
});

test('replaces the existing marker block without changing surrounding text', () => {
  const body = `Author text\n\n${oldSummary}\n\nFooter text\n`;
  assert.equal(
    replacePlaywrightBlock(body, summary),
    `Author text\n\n${summary}\n\nFooter text\n`,
  );
});

test('rejects malformed or duplicate marker blocks', () => {
  assert.throws(
    () => validateSummaryBlock(`${START_MARKER}\nMissing end`),
    /exactly one complete marker block/,
  );
  assert.throws(
    () => replacePlaywrightBlock(`${START_MARKER}\n${START_MARKER}\n${END_MARKER}`, summary),
    /duplicate or unmatched/,
  );
  assert.throws(
    () => replacePlaywrightBlock(`${END_MARKER}\n${START_MARKER}`, summary),
    /wrong order/,
  );
});

test('rejects a missing or oversized summary file', async () => {
  await assert.rejects(
    readSummaryBlock('/does/not/exist/playwright-summary.md'),
    /Playwright summary not found/,
  );
  await withSummaryFile(
    (summaryPath) => assert.rejects(
      readSummaryBlock(summaryPath, 1),
      /exceeds the 1-byte size limit/,
    ),
  );
});

test('updates the current PR head through the GitHub API', async () => {
  await withSummaryFile(async (summaryPath) => {
    const requests = [];
    const responses = [
      mockResponse({ head: { sha: headSha }, body: 'Author text' }),
      mockResponse({ head: { sha: headSha }, body: `Author text\n\n${summary}` }),
    ];
    const fetchImpl = async (url, options) => {
      requests.push({ url, options });
      return responses.shift();
    };
    const messages = [];

    const result = await updatePullRequestBody({
      env: validEnvironment,
      summaryPath,
      fetchImpl,
      log: (message) => messages.push(message),
    });

    assert.deepEqual(result, { updated: true, reason: 'updated' });
    assert.equal(requests.length, 2);
    assert.equal(
      requests[0].url,
      'https://github.example.test/api/v3/repos/AdobeDocs/adp-devsite/pulls/123',
    );
    assert.equal(requests[0].options.method, undefined);
    assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token');
    assert.equal(requests[1].options.method, 'PATCH');
    assert.equal(requests[1].options.headers['Content-Type'], 'application/json');
    assert.deepEqual(
      JSON.parse(requests[1].options.body),
      { body: `Author text\n\n${summary}` },
    );
    assert.match(messages.join('\n'), /updated in the pull request description/);
  });
});

test('skips a stale run without sending PATCH', async () => {
  await withSummaryFile(async (summaryPath) => {
    const requests = [];
    const newerSha = 'def1234567890abc1234567890abc1234567890a';
    const fetchImpl = async (url, options) => {
      requests.push({ url, options });
      return mockResponse({ head: { sha: newerSha }, body: 'Author text' });
    };
    const messages = [];

    const result = await updatePullRequestBody({
      env: validEnvironment,
      summaryPath,
      fetchImpl,
      log: (message) => messages.push(message),
    });

    assert.deepEqual(result, { updated: false, reason: 'stale' });
    assert.equal(requests.length, 1);
    assert.match(messages.join('\n'), /Skipping PR body update/);
  });
});

test('falls back to GITHUB_SHA when PR_HEAD_SHA is absent', async () => {
  await withSummaryFile(async (summaryPath) => {
    const requests = [];
    const fetchImpl = async (url, options) => {
      requests.push({ url, options });
      return mockResponse({ head: { sha: mergeSha }, body: null });
    };

    const result = await updatePullRequestBody({
      env: { ...validEnvironment, PR_HEAD_SHA: '' },
      summaryPath,
      fetchImpl,
      log: () => {},
    });

    assert.deepEqual(result, { updated: true, reason: 'updated' });
    assert.equal(requests.length, 2);
    assert.deepEqual(JSON.parse(requests[1].options.body), { body: summary });
  });
});

test('fails clearly when GitHub rejects authorization', async () => {
  await withSummaryFile(async (summaryPath) => {
    const fetchImpl = async () => mockResponse(
      { message: 'Resource not accessible by integration' },
      { status: 403, statusText: 'Forbidden' },
    );

    await assert.rejects(
      updatePullRequestBody({
        env: validEnvironment,
        summaryPath,
        fetchImpl,
        log: () => {},
      }),
      /GitHub authorization failed \(403\): Resource not accessible by integration/,
    );
  });
});

test('requires and validates workflow configuration before calling GitHub', async () => {
  await withSummaryFile(async (summaryPath) => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return mockResponse({});
    };

    await assert.rejects(
      updatePullRequestBody({
        env: { ...validEnvironment, GITHUB_TOKEN: '' },
        summaryPath,
        fetchImpl,
      }),
      /Missing required environment variable: GITHUB_TOKEN/,
    );
    await assert.rejects(
      updatePullRequestBody({
        env: { ...validEnvironment, PR_NUMBER: 'not-a-number' },
        summaryPath,
        fetchImpl,
      }),
      /PR_NUMBER must be a positive integer/,
    );
    await assert.rejects(
      updatePullRequestBody({
        env: { ...validEnvironment, GITHUB_API_URL: 'http:\/\/api.github.com' },
        summaryPath,
        fetchImpl,
      }),
      /valid HTTPS URL without credentials/,
    );
    assert.equal(calls, 0);
  });
});

test('rejects malformed pull request responses', async () => {
  await withSummaryFile(async (summaryPath) => {
    await assert.rejects(
      updatePullRequestBody({
        env: validEnvironment,
        summaryPath,
        fetchImpl: async () => mockResponse('{not JSON'),
      }),
      /malformed pull request JSON/,
    );
    await assert.rejects(
      updatePullRequestBody({
        env: validEnvironment,
        summaryPath,
        fetchImpl: async () => mockResponse({ body: 'Missing head' }),
      }),
      /missing head\.sha/,
    );
  });
});
