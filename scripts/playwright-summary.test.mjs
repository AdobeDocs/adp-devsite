import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MAX_ESCAPED_FIELD_LENGTH,
  MAX_FIELD_LENGTH,
  boundedText,
  buildSummary,
  buildWorkflowLink,
  escapeTableCell,
  formatStatus,
  formatTestCounts,
  readTestCounts,
  writePlaywrightSummary,
} from './playwright-summary.mjs';

const scriptPath = fileURLToPath(new URL('./playwright-summary.mjs', import.meta.url));
const environmentKeys = [
  'TEST_OUTCOME',
  'GITHUB_SHA',
  'PR_HEAD_SHA',
  'PLAYWRIGHT_BASE_URL',
  'GITHUB_SERVER_URL',
  'GITHUB_REPOSITORY',
  'GITHUB_RUN_ID',
];

const validEnvironment = {
  TEST_OUTCOME: 'success',
  GITHUB_SHA: '1111111111111111111111111111111111111111',
  PR_HEAD_SHA: 'abc1234567890abc1234567890abc1234567890a',
  PLAYWRIGHT_BASE_URL: 'https://abc123--adp-devsite-stage--adobedocs.aem.page',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'AdobeDocs/adp-devsite',
  GITHUB_RUN_ID: '123',
};

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(path.join(tmpdir(), 'playwright-summary-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function captureWarnings(callback) {
  const messages = [];
  const originalWarn = console.warn;
  console.warn = (message) => messages.push(String(message));
  try {
    return { value: await callback(), messages };
  } finally {
    console.warn = originalWarn;
  }
}

test('uses aggregate statistics and the PR head SHA', async () => {
  await withTemporaryDirectory(async (directory) => {
    const resultsPath = path.join(directory, 'playwright-results.json');
    const summaryPath = path.join(directory, 'playwright-summary.md');
    await writeFile(resultsPath, JSON.stringify({
      stats: {
        expected: 2,
        unexpected: 1,
        flaky: 3,
        skipped: 4,
      },
    }));

    await writePlaywrightSummary({
      env: validEnvironment,
      resultsPath,
      summaryPath,
      timestamp: new Date('2026-08-24T14:00:00Z'),
    });
    const summary = await readFile(summaryPath, 'utf8');

    assert.match(summary, /^<!-- playwright-results:start -->/);
    assert.match(summary, /\| Status \| ✅ Passed \|/);
    assert.match(summary, /\| Commit \| <code>abc1234<\/code> \|/);
    assert.match(summary, /\| Tests \| 2 passed, 1 failed, 3 flaky, 4 skipped \|/);
    assert.match(
      summary,
      /\[Open run and artifacts\]\(https:\/\/github\.com\/AdobeDocs\/adp-devsite\/actions\/runs\/123\)/,
    );
    assert.match(summary, /_Last updated: 2026-08-24T14:00:00\.000Z_/);
    assert.match(summary, /<!-- playwright-results:end -->\n$/);
  });
});

test('the CLI writes a useful summary when the report is missing', async () => {
  await withTemporaryDirectory(async (directory) => {
    const childEnv = { ...process.env };
    environmentKeys.forEach((key) => { delete childEnv[key] });
    Object.assign(childEnv, validEnvironment, { TEST_OUTCOME: 'failure' });

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: directory,
      env: childEnv,
      encoding: 'utf8',
      timeout: 5_000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);

    const summary = await readFile(path.join(directory, 'playwright-summary.md'), 'utf8');
    assert.match(result.stderr, /results are missing/);
    assert.match(summary, /\| Status \| ❌ Failed \|/);
    assert.match(summary, /\| Tests \| Unavailable \|/);
  });
});

test('retains valid counts when one aggregate field is malformed', async () => {
  await withTemporaryDirectory(async (directory) => {
    const resultsPath = path.join(directory, 'playwright-results.json');
    await writeFile(resultsPath, JSON.stringify({
      stats: {
        expected: 2,
        unexpected: 0,
        flaky: 0,
      },
    }));

    const { value: counts, messages } = await captureWarnings(
      () => readTestCounts(resultsPath),
    );
    assert.deepEqual(counts, {
      passed: 2,
      failed: 0,
      flaky: 0,
      skipped: null,
    });
    assert.match(messages.join('\n'), /invalid aggregate counts: skipped/);

    const summary = buildSummary(validEnvironment, counts);
    assert.match(summary, /2 passed, 0 failed, 0 flaky, unknown skipped/);
  });
});

test('handles malformed JSON and invalid report shapes', async () => {
  await withTemporaryDirectory(async (directory) => {
    const resultsPath = path.join(directory, 'playwright-results.json');
    const invalidReports = ['{not json', 'null', '[]', '{}', '{"stats":[]}'];

    for (const contents of invalidReports) {
      await writeFile(resultsPath, contents);
      const { value: counts, messages } = await captureWarnings(
        () => readTestCounts(resultsPath),
      );
      assert.equal(counts, null);
      assert.match(messages.join('\n'), /Playwright results are unavailable/);
    }
  });
});

test('reports an oversized results file distinctly', async () => {
  await withTemporaryDirectory(async (directory) => {
    const resultsPath = path.join(directory, 'playwright-results.json');
    await writeFile(resultsPath, '{}');

    const { value: counts, messages } = await captureWarnings(
      () => readTestCounts(resultsPath, 1),
    );
    assert.equal(counts, null);
    assert.match(messages.join('\n'), /exceeds the 1-byte size limit/);
  });
});

test('bounds and neutralizes Markdown in environment values', () => {
  const untrusted = `https://example.test/[click](https://evil.test) ![pixel](https://evil.test/p)\n|\`<tag>`;
  const escaped = escapeTableCell(untrusted);
  const summary = buildSummary({
    ...validEnvironment,
    GITHUB_SHA: 'bad|`<sha>',
    PR_HEAD_SHA: '',
    PLAYWRIGHT_BASE_URL: untrusted,
  }, {
    passed: 0,
    failed: 0,
    flaky: 0,
    skipped: 0,
  });

  assert.doesNotMatch(escaped, /[|`<>\[\]().!_:@]/);
  assert.match(escaped, /&#91;click&#93;&#40;https&#58;\/\/evil&#46;test&#41;/);
  assert.doesNotMatch(summary, /\[click\]|\[pixel\]|<tag>/);
  assert.match(summary, /bad&#124;&#96;&#60;sha&#62;/);

  const bounded = boundedText('😀'.repeat(MAX_FIELD_LENGTH + 100));
  assert.equal(Array.from(bounded).length, MAX_FIELD_LENGTH);
  assert.equal(Array.from(bounded).at(-2), '😀');
  assert.ok(bounded.endsWith('…'));
  assert.doesNotMatch(bounded, /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/);

  const expanded = escapeTableCell(':'.repeat(MAX_FIELD_LENGTH));
  assert.ok(expanded.length <= MAX_ESCAPED_FIELD_LENGTH);
});

test('accepts only sanitized HTTPS workflow origins', () => {
  assert.equal(
    buildWorkflowLink({
      GITHUB_SERVER_URL: 'https://github.example.test/path?query=1#fragment',
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_RUN_ID: '42',
    }),
    '[Open run and artifacts](https://github.example.test/owner/repo/actions/runs/42)',
  );
  assert.equal(buildWorkflowLink({
    GITHUB_SERVER_URL: 'http://github.com',
    GITHUB_REPOSITORY: 'owner/repo',
    GITHUB_RUN_ID: '42',
  }), 'Unavailable');
  assert.equal(buildWorkflowLink({
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_REPOSITORY: 'owner/repo',
    GITHUB_RUN_ID: 'not-a-number',
  }), 'Unavailable');
  assert.equal(
    buildWorkflowLink({
      GITHUB_SERVER_URL: 'https://e)v.test',
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_RUN_ID: '42',
    }),
    '[Open run and artifacts](https://e%29v.test/owner/repo/actions/runs/42)',
  );
});

test('renders wholly invalid aggregate statistics as unavailable', () => {
  assert.equal(formatTestCounts({
    passed: null,
    failed: null,
    flaky: null,
    skipped: null,
  }), 'Unavailable');
});

test('maps all supported outcomes without echoing unknown values', () => {
  assert.equal(formatStatus('success'), '✅ Passed');
  assert.equal(formatStatus('failure'), '❌ Failed');
  assert.equal(formatStatus('cancelled'), '⚪ Cancelled');
  assert.equal(formatStatus('skipped'), '⚪ Skipped');
  assert.equal(formatStatus('success|forged'), '⚠️ Unknown');
  assert.equal(formatStatus(undefined), '⚠️ Unknown');
});
