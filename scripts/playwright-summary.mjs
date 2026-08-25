import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESULTS_PATH = path.resolve('playwright-results.json');
export const SUMMARY_PATH = path.resolve('playwright-summary.md');
export const MAX_RESULTS_BYTES = 10 * 1024 * 1024;
export const MAX_FIELD_LENGTH = 300;
export const MAX_ESCAPED_FIELD_LENGTH = 2_048;

export function boundedText(value, maxLength = MAX_FIELD_LENGTH) {
  const normalized = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const characters = Array.from(normalized);

  if (characters.length <= maxLength) return normalized;
  return `${characters.slice(0, maxLength - 1).join('')}…`;
}

export function escapeTableCell(
  value,
  maxLength = MAX_FIELD_LENGTH,
  maxEscapedLength = MAX_ESCAPED_FIELD_LENGTH,
) {
  const encoded = [];
  let encodedLength = 0;
  const truncationMarker = '&#8230;';
  if (maxEscapedLength < truncationMarker.length) return '';

  for (const character of boundedText(value, maxLength)) {
    const encodedCharacter = /[A-Za-z0-9 /-]/.test(character)
      ? character
      : `&#${character.codePointAt(0)};`;
    if (encodedLength + encodedCharacter.length > maxEscapedLength) {
      while (encodedLength + truncationMarker.length > maxEscapedLength) {
        encodedLength -= encoded.pop().length;
      }
      encoded.push(truncationMarker);
      break;
    }
    encoded.push(encodedCharacter);
    encodedLength += encodedCharacter.length;
  }

  return encoded.join('');
}

export function formatStatus(outcome) {
  switch (boundedText(outcome, 20).toLowerCase()) {
    case 'success':
      return '✅ Passed';
    case 'failure':
      return '❌ Failed';
    case 'cancelled':
      return '⚪ Cancelled';
    case 'skipped':
      return '⚪ Skipped';
    default:
      return '⚠️ Unknown';
  }
}

export function formatCommit(sha) {
  const normalized = boundedText(sha, 64);
  const display = /^[0-9a-f]{7,64}$/i.test(normalized)
    ? normalized.slice(0, 7)
    : normalized;
  return display ? `<code>${escapeTableCell(display, 64)}</code>` : 'Unavailable';
}

export function formatTarget(baseUrl) {
  const target = escapeTableCell(baseUrl);
  return target ? `<code>${target}</code>` : 'Unavailable';
}

export function buildWorkflowLink(env) {
  const serverUrl = boundedText(env.GITHUB_SERVER_URL, 200);
  const repository = boundedText(env.GITHUB_REPOSITORY, 200);
  const runId = boundedText(env.GITHUB_RUN_ID, 30);

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    || !/^\d+$/.test(runId)) {
    return 'Unavailable';
  }

  try {
    const server = new URL(serverUrl);
    if (server.protocol !== 'https:'
      || !server.hostname
      || server.username
      || server.password) {
      return 'Unavailable';
    }

    const [owner, repo] = repository.split('/').map(encodeURIComponent);
    const workflowUrl = new URL(
      `/${owner}/${repo}/actions/runs/${runId}`,
      server.origin,
    );
    const safeUrl = workflowUrl.toString()
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
    return `[Open run and artifacts](${safeUrl})`;
  } catch {
    return 'Unavailable';
  }
}

export function parseCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function warn(message) {
  console.warn(boundedText(message, 300));
}

export async function readTestCounts(
  resultsPath = RESULTS_PATH,
  maxResultsBytes = MAX_RESULTS_BYTES,
) {
  try {
    const resultsStat = await stat(resultsPath);
    if (resultsStat.size > maxResultsBytes) {
      throw new Error(`Playwright report exceeds the ${maxResultsBytes}-byte size limit`);
    }

    const report = JSON.parse(await readFile(resultsPath, 'utf8'));
    if (!report || typeof report !== 'object' || Array.isArray(report)
      || !report.stats || typeof report.stats !== 'object' || Array.isArray(report.stats)) {
      throw new Error('Playwright report does not contain aggregate statistics');
    }

    const counts = {
      passed: parseCount(report.stats.expected),
      failed: parseCount(report.stats.unexpected),
      flaky: parseCount(report.stats.flaky),
      skipped: parseCount(report.stats.skipped),
    };
    const invalidCounts = Object.entries(counts)
      .filter(([, value]) => value === null)
      .map(([name]) => name);

    if (invalidCounts.length > 0) {
      warn(`Playwright report has invalid aggregate counts: ${invalidCounts.join(', ')}`);
    }
    return counts;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      warn('Playwright results are missing; test counts will be unavailable.');
    } else {
      warn(`Playwright results are unavailable: ${error?.message || 'unknown report error'}`);
    }
    return null;
  }
}

function formatCount(value) {
  return value === null ? 'unknown' : value;
}

export function formatTestCounts(counts) {
  if (!counts || Object.values(counts).every((value) => value === null)) {
    return 'Unavailable';
  }
  return [
    `${formatCount(counts.passed)} passed`,
    `${formatCount(counts.failed)} failed`,
    `${formatCount(counts.flaky)} flaky`,
    `${formatCount(counts.skipped)} skipped`,
  ].join(', ');
}

export function buildSummary(env, counts, timestamp = new Date()) {
  return [
    '<!-- playwright-results:start -->',
    '## Playwright test results',
    '',
    '| Result | Value |',
    '|---|---|',
    `| Status | ${formatStatus(env.TEST_OUTCOME)} |`,
    `| Commit | ${formatCommit(env.PR_HEAD_SHA || env.GITHUB_SHA)} |`,
    `| Target | ${formatTarget(env.PLAYWRIGHT_BASE_URL)} |`,
    '| Browser | Chromium, 1280×900 |',
    `| Tests | ${formatTestCounts(counts)} |`,
    `| Workflow | ${buildWorkflowLink(env)} |`,
    '',
    `_Last updated: ${timestamp.toISOString()}_`,
    '<!-- playwright-results:end -->',
    '',
  ].join('\n');
}

export async function writePlaywrightSummary({
  env = process.env,
  resultsPath = RESULTS_PATH,
  summaryPath = SUMMARY_PATH,
  timestamp = new Date(),
} = {}) {
  const counts = await readTestCounts(resultsPath);
  await writeFile(summaryPath, buildSummary(env, counts, timestamp), 'utf8');
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await writePlaywrightSummary();
}
