import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { END_MARKER, START_MARKER } from './playwright-summary.mjs';

export { END_MARKER, START_MARKER };
export const SUMMARY_PATH = path.resolve('playwright-summary.md');
export const MAX_SUMMARY_BYTES = 64 * 1024;
export const MAX_PR_BODY_LENGTH = 65_536;
export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 10_000;
const MAX_ERROR_LENGTH = 500;

function boundedText(value, maxLength = MAX_ERROR_LENGTH) {
  const normalized = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const characters = Array.from(normalized);
  if (characters.length <= maxLength) return normalized;
  return `${characters.slice(0, maxLength - 1).join('')}…`;
}

function requireEnvironment(env, name, maxLength) {
  const value = String(env[name] ?? '').trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  if (value.length > maxLength) throw new Error(`${name} exceeds its length limit`);
  return value;
}

function countOccurrences(text, value) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(value, offset)) !== -1) {
    count += 1;
    offset += value.length;
  }
  return count;
}

export function validateSummaryBlock(contents) {
  const summary = String(contents).trim();
  if (!summary.startsWith(START_MARKER)
    || !summary.endsWith(END_MARKER)
    || countOccurrences(summary, START_MARKER) !== 1
    || countOccurrences(summary, END_MARKER) !== 1) {
    throw new Error('Playwright summary must contain exactly one complete marker block');
  }
  return summary;
}

export function replacePlaywrightBlock(body, summaryContents) {
  const originalBody = body == null ? '' : String(body);
  const summary = validateSummaryBlock(summaryContents);
  const startCount = countOccurrences(originalBody, START_MARKER);
  const endCount = countOccurrences(originalBody, END_MARKER);

  if (startCount === 0 && endCount === 0) {
    if (!originalBody) return summary;
    const separator = originalBody.endsWith('\n\n')
      ? ''
      : originalBody.endsWith('\n') ? '\n' : '\n\n';
    return `${originalBody}${separator}${summary}`;
  }

  if (startCount !== 1 || endCount !== 1) {
    throw new Error('Pull request body contains duplicate or unmatched Playwright markers');
  }

  const start = originalBody.indexOf(START_MARKER);
  const end = originalBody.indexOf(END_MARKER, start + START_MARKER.length);
  if (end === -1) {
    throw new Error('Pull request body contains Playwright markers in the wrong order');
  }

  return `${originalBody.slice(0, start)}${summary}${originalBody.slice(end + END_MARKER.length)}`;
}

export async function readSummaryBlock(
  summaryPath = SUMMARY_PATH,
  maxSummaryBytes = MAX_SUMMARY_BYTES,
) {
  try {
    const summaryStat = await stat(summaryPath);
    if (summaryStat.size > maxSummaryBytes) {
      throw new Error(`Playwright summary exceeds the ${maxSummaryBytes}-byte size limit`);
    }
    return validateSummaryBlock(await readFile(summaryPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Playwright summary not found: ${summaryPath}`);
    }
    throw error;
  }
}

function parseConfiguration(env) {
  const token = requireEnvironment(env, 'GITHUB_TOKEN', 2_048);
  const repository = requireEnvironment(env, 'GITHUB_REPOSITORY', 200);
  const prNumber = requireEnvironment(env, 'PR_NUMBER', 20);
  const expectedHeadSha = requireEnvironment(env, 'PR_HEAD_SHA', 64);

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must have the form owner/repository');
  }
  if (!/^[1-9]\d*$/.test(prNumber)) {
    throw new Error('PR_NUMBER must be a positive integer');
  }
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(expectedHeadSha)) {
    throw new Error('PR_HEAD_SHA must be a full lowercase 40- or 64-character commit SHA');
  }

  const apiUrl = String(env.GITHUB_API_URL || 'https://api.github.com').trim();
  let apiBase;
  try {
    apiBase = new URL(apiUrl);
  } catch {
    throw new Error('GITHUB_API_URL must be a valid HTTPS URL');
  }
  if (apiBase.protocol !== 'https:' || !apiBase.hostname
    || apiBase.username || apiBase.password) {
    throw new Error('GITHUB_API_URL must be a valid HTTPS URL without credentials');
  }

  const [owner, repo] = repository.split('/').map(encodeURIComponent);
  const basePath = apiBase.pathname.replace(/\/$/, '');
  const pullUrl = new URL(
    `${basePath}/repos/${owner}/${repo}/pulls/${prNumber}`,
    apiBase.origin,
  ).toString();

  return {
    token,
    expectedHeadSha,
    pullUrl,
  };
}

async function responseMessage(response) {
  try {
    const body = await response.text();
    if (!body) return response.statusText || 'no response body';
    try {
      const parsed = JSON.parse(body);
      return boundedText(parsed?.message || body);
    } catch {
      return boundedText(body);
    }
  } catch {
    return response.statusText || 'unreadable response body';
  }
}

function retryDelay(response, attempt) {
  const retryAfterHeader = response?.headers?.get?.('retry-after');
  const retryAfter = Number(retryAfterHeader);
  if (retryAfterHeader != null && retryAfterHeader !== ''
    && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1_000, MAX_RETRY_DELAY_MS);
  }
  return Math.min(RETRY_BASE_DELAY_MS * (2 ** attempt), MAX_RETRY_DELAY_MS);
}

function isRetryableResponse(response) {
  return response.status === 429
    || response.status >= 500
    || (response.status === 403 && response.headers?.get?.('retry-after') != null);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function githubRequest(fetchImpl, url, token, options = {}) {
  let lastNetworkError;

  for (let attempt = 0; attempt < MAX_REQUEST_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...options.headers,
        },
      });
      lastNetworkError = null;
    } catch (error) {
      lastNetworkError = error;
      if (attempt < MAX_REQUEST_ATTEMPTS - 1) {
        await sleep(Math.min(RETRY_BASE_DELAY_MS * (2 ** attempt), MAX_RETRY_DELAY_MS));
        continue;
      }
      break;
    }

    if (response.ok) return response;
    if (isRetryableResponse(response) && attempt < MAX_REQUEST_ATTEMPTS - 1) {
      try {
        await response.body?.cancel?.();
      } catch {
        // The next bounded attempt is still safe if a response body cannot be cancelled.
      }
      await sleep(retryDelay(response, attempt));
      continue;
    }

    const detail = await responseMessage(response);
    const isRateLimited = response.status === 403
      && response.headers?.get?.('retry-after') != null;
    if (response.status === 401 || (response.status === 403 && !isRateLimited)) {
      throw new Error(`GitHub authorization failed (${response.status}): ${detail}`);
    }
    throw new Error(`GitHub request failed (${response.status}): ${detail}`);
  }

  throw new Error(`GitHub request failed after ${MAX_REQUEST_ATTEMPTS} attempts: ${boundedText(lastNetworkError?.message || lastNetworkError)}`);
}

export async function updatePullRequestBody({
  env = process.env,
  summaryPath = SUMMARY_PATH,
  fetchImpl = globalThis.fetch,
  log = console.log,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required');
  }

  const configuration = parseConfiguration(env);
  const summary = await readSummaryBlock(summaryPath);
  const getResponse = await githubRequest(
    fetchImpl,
    configuration.pullUrl,
    configuration.token,
  );

  let pullRequest;
  try {
    pullRequest = await getResponse.json();
  } catch {
    throw new Error('GitHub returned malformed pull request JSON');
  }
  const currentHeadSha = pullRequest?.head?.sha;
  if (typeof currentHeadSha !== 'string' || !currentHeadSha) {
    throw new Error('GitHub pull request response is missing head.sha');
  }

  if (currentHeadSha !== configuration.expectedHeadSha) {
    log(`Skipping PR body update: current head ${boundedText(currentHeadSha, 64)} does not match run ${configuration.expectedHeadSha}.`);
    return { updated: false, reason: 'stale' };
  }

  if (pullRequest.body !== null && typeof pullRequest.body !== 'string') {
    throw new Error('GitHub pull request response contains an invalid body');
  }
  const body = replacePlaywrightBlock(pullRequest.body, summary);
  if (Array.from(body).length > MAX_PR_BODY_LENGTH) {
    throw new Error(`Updated pull request body exceeds GitHub's ${MAX_PR_BODY_LENGTH}-character limit`);
  }
  await githubRequest(
    fetchImpl,
    configuration.pullUrl,
    configuration.token,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  );

  log('Playwright results updated in the pull request description.');
  return { updated: true, reason: 'updated' };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await updatePullRequestBody();
  } catch (error) {
    console.error(`Failed to update pull request description: ${boundedText(error?.message || error)}`);
    process.exitCode = 1;
  }
}
