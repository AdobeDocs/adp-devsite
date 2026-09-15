import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildSummary } from './playwright-summary.mjs';
import {
  END_MARKER,
  MAX_PR_BODY_LENGTH,
  REQUEST_TIMEOUT_MS,
  START_MARKER,
  readSummaryBlock,
  replacePlaywrightBlock,
  updatePullRequestBody,
  validateSummaryBlock,
} from './update-playwright-pr-body.mjs';

const scriptPath = fileURLToPath(new URL('./update-playwright-pr-body.mjs', import.meta.url));
const headSha = 'abc1234567890abc1234567890abc1234567890a';
const summary = `${START_MARKER}\n## Playwright test results\n\nNew results\n${END_MARKER}`;
const oldSummary = `${START_MARKER}\nOld results\n${END_MARKER}`;
const validEnvironment = {
  GITHUB_TOKEN: 'test-token',
  GITHUB_REPOSITORY: 'AdobeDocs/adp-devsite',
  PR_NUMBER: '123',
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

function mockResponse(data, {
  status = 200,
  statusText = 'OK',
  headers = {},
} = {}) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get(name) {
        return normalizedHeaders[name.toLowerCase()] ?? null;
      },
    },
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
  const updated = replacePlaywrightBlock(body, summary);
  assert.equal(updated, `Author text\n\n${summary}\n\nFooter text\n`);
  assert.equal(replacePlaywrightBlock(updated, summary), updated);
});

test('accepts the marker contract emitted by the summary generator', () => {
  const generated = buildSummary({}, null, new Date('2026-08-24T14:00:00Z'));
  assert.equal(validateSummaryBlock(generated), generated.trim());
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
      mockResponse({ head: { sha: headSha }, body: `Author text\n\n${oldSummary}` }),
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
    assert.equal(requests[0].options.signal instanceof AbortSignal, true);
    assert.equal(requests[0].options.signal.aborted, false);
    assert.equal(REQUEST_TIMEOUT_MS, 15_000);
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

test('requires the full lowercase PR head SHA', async () => {
  await withSummaryFile(async (summaryPath) => {
    for (const invalidSha of ['', headSha.slice(0, 7), headSha.toUpperCase()]) {
      await assert.rejects(
        updatePullRequestBody({
          env: { ...validEnvironment, PR_HEAD_SHA: invalidSha },
          summaryPath,
          fetchImpl: async () => mockResponse({}),
        }),
        invalidSha ? /full lowercase 40- or 64-character/ : /Missing required environment variable: PR_HEAD_SHA/,
      );
    }
  });
});

test('fails clearly when GitHub rejects PATCH authorization', async () => {
  await withSummaryFile(async (summaryPath) => {
    const responses = [
      mockResponse({ head: { sha: headSha }, body: 'Author text' }),
      mockResponse(
        { message: 'Resource not accessible by integration' },
        { status: 403, statusText: 'Forbidden' },
      ),
    ];
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return responses.shift();
    };

    await assert.rejects(
      updatePullRequestBody({
        env: validEnvironment,
        summaryPath,
        fetchImpl,
        log: () => {},
      }),
      /GitHub authorization failed \(403\): Resource not accessible by integration/,
    );
    assert.equal(calls, 2);
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
        env: { ...validEnvironment, GITHUB_REPOSITORY: 'not-a-repository' },
        summaryPath,
        fetchImpl,
      }),
      /form owner\/repository/,
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
    await assert.rejects(
      updatePullRequestBody({
        env: validEnvironment,
        summaryPath,
        fetchImpl: async () => mockResponse({ head: { sha: headSha }, body: 42 }),
      }),
      /contains an invalid body/,
    );
  });
});

test('retries transient GitHub errors', async () => {
  await withSummaryFile(async (summaryPath) => {
    const responses = [
      mockResponse(
        { message: 'Service unavailable' },
        { status: 503, headers: { 'Retry-After': '0' } },
      ),
      mockResponse({ head: { sha: headSha }, body: 'Author text' }),
      mockResponse({}),
    ];
    let calls = 0;

    const result = await updatePullRequestBody({
      env: validEnvironment,
      summaryPath,
      fetchImpl: async () => {
        calls += 1;
        return responses.shift();
      },
      log: () => {},
    });

    assert.deepEqual(result, { updated: true, reason: 'updated' });
    assert.equal(calls, 3);
  });
});

test('the CLI exits unsuccessfully with a clear configuration error', () => {
  const env = { ...process.env };
  delete env.GITHUB_TOKEN;
  const result = spawnSync(process.execPath, [scriptPath], {
    env,
    encoding: 'utf8',
    timeout: 5_000,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing required environment variable: GITHUB_TOKEN/);
});

test('rejects a combined PR body over GitHub\'s limit without truncating it', async () => {
  await withSummaryFile(async (summaryPath) => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return mockResponse({
        head: { sha: headSha },
        body: 'x'.repeat(MAX_PR_BODY_LENGTH),
      });
    };

    await assert.rejects(
      updatePullRequestBody({
        env: validEnvironment,
        summaryPath,
        fetchImpl,
      }),
      /exceeds GitHub's 65536-character limit/,
    );
    assert.equal(calls, 1);
  });
});
