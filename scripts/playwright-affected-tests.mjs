import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BASE_REF = 'origin/main';
export const TEST_LIST_PATH = path.resolve('playwright-affected-tests.txt');
export const DEFAULT_API_URL = 'https://api.github.com';
// The pulls/files endpoint returns at most 3000 files (100 per page).
export const MAX_PULL_REQUEST_FILES_PAGES = 30;

// Playwright resolves config.rootDir to the configured testDir
// (tests/playwright), and --test-list entries are matched against paths
// relative to rootDir. Existence checks stay repo-root-relative.
export const TEST_DIR_PREFIX = 'tests/playwright/';

// Files whose changes can affect every spec. Everything else under
// hlx_statics/ and tests/playwright/ is shared infrastructure and also
// triggers the full suite; only hlx_statics/blocks/<block>/ and the block's
// specs map to that block, which selects every spec the block has.
export const FULL_SUITE_FILES = new Set([
  '.github/workflows/playwright.yml',
  'package.json',
  'package-lock.json',
  'playwright.config.mjs',
]);

const BLOCK_SOURCE_PATTERN = /^hlx_statics\/blocks\/([^/]+)\//;
export const BLOCK_SPECS_DIR = 'tests/playwright/blocks';
// A block's specs are <block>.spec.mjs plus optional <block>.<feature>.spec.mjs
// files. Block folders never contain dots, so the first dot ends the block
// name; a hyphen would be ambiguous (`info` versus `info-card`).
const SPEC_FILE_PATTERN = /^([^/.]+)(?:\.[^/.]+)?\.spec\.mjs$/;
const SPEC_PATTERN = /^tests\/playwright\/blocks\/([^/.]+)(?:\.[^/.]+)?\.spec\.mjs(?:$|-snapshots\/)/;

function warn(message) {
  console.warn(String(message ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300));
}

export function blockToSpec(block) {
  return `${BLOCK_SPECS_DIR}/${block}.spec.mjs`;
}

/**
 * Lists every existing spec for a block: <block>.spec.mjs and any
 * <block>.<feature>.spec.mjs, as repo-root-relative paths.
 */
export function findBlockSpecs(block, cwd = process.cwd()) {
  let entries;
  try {
    entries = readdirSync(path.join(cwd, BLOCK_SPECS_DIR), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.match(SPEC_FILE_PATTERN)?.[1] === block)
    .map((entry) => `${BLOCK_SPECS_DIR}/${entry.name}`)
    .sort();
}

export function classifyChangedFile(file) {
  const normalized = String(file ?? '').trim().replace(/^\.\//, '');
  if (!normalized) return { type: 'unrelated' };

  const block = normalized.match(BLOCK_SOURCE_PATTERN);
  if (block) return { type: 'block', block: block[1] };

  const spec = normalized.match(SPEC_PATTERN);
  if (spec) return { type: 'spec', block: spec[1] };

  if (FULL_SUITE_FILES.has(normalized)
    || normalized.startsWith('hlx_statics/')
    || normalized.startsWith('tests/playwright/')) {
    return { type: 'shared' };
  }

  return { type: 'unrelated' };
}

export function computeAffectedSpecs(changedFiles, listBlockSpecs = (block) => [blockToSpec(block)]) {
  const specs = new Set();
  const skipped = new Set();

  for (const file of changedFiles) {
    const change = classifyChangedFile(file);
    if (change.type === 'shared') {
      return { mode: 'all', specs: [], skipped: [] };
    }
    if (change.type === 'block' || change.type === 'spec') {
      const blockSpecs = listBlockSpecs(change.block);
      if (blockSpecs.length) {
        blockSpecs.forEach((spec) => specs.add(spec));
      } else {
        skipped.add(change.block);
      }
    }
  }

  return { mode: 'subset', specs: [...specs].sort(), skipped: [...skipped].sort() };
}

export function listChangedFiles(baseRef, cwd = process.cwd()) {
  const output = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output.split('\n').filter((line) => line.trim().length > 0);
}

// Lists the files changed by a pull request via the GitHub REST API
// (GET /repos/{owner}/{repo}/pulls/{number}/files). Preferred over git diff in
// CI: container checkouts may not include a usable .git directory.
export async function listPullRequestFiles({
  apiUrl = DEFAULT_API_URL,
  repository,
  prNumber,
  token,
  fetchImpl = fetch,
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository ?? ''))) {
    throw new Error('Invalid GitHub repository');
  }
  if (!/^\d+$/.test(String(prNumber ?? ''))) {
    throw new Error('Invalid pull request number');
  }
  const base = new URL(String(apiUrl ?? ''));
  if (base.protocol !== 'https:' || base.username || base.password) {
    throw new Error('GitHub API URL must be a plain HTTPS URL');
  }

  const files = [];
  for (let page = 1; page <= MAX_PULL_REQUEST_FILES_PAGES; page += 1) {
    const url = new URL(`${base.origin}${base.pathname.replace(/\/$/, '')}/repos/${repository}/pulls/${prNumber}/files`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    // The token travels only in the Authorization header and is never logged.
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'adp-devsite-playwright-affected-tests',
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status} while listing pull request files (page ${page})`);
    }
    const pageFiles = await response.json();
    if (!Array.isArray(pageFiles)) {
      throw new Error('GitHub API returned a malformed pull request files payload');
    }
    files.push(...pageFiles.map((entry) => entry?.filename).filter((name) => typeof name === 'string'));
    if (pageFiles.length < 100) return files;
  }
  return files;
}

export function buildTestListContent(specs, source) {
  const entries = specs.map((spec) => (spec.startsWith(TEST_DIR_PREFIX)
    ? spec.slice(TEST_DIR_PREFIX.length)
    : spec));
  return [
    '# Generated by scripts/playwright-affected-tests.mjs; consumed by `playwright test --test-list`.',
    `# Changed files were determined via ${source}. Paths are relative to the`,
    '# Playwright rootDir (testDir: tests/playwright).',
    ...entries,
    '',
  ].join('\n');
}

export async function resolveAffectedTests({
  env = process.env,
  cwd = process.cwd(),
  listPath = TEST_LIST_PATH,
  baseRef,
  fetchImpl = fetch,
} = {}) {
  if (String(env.PLAYWRIGHT_FULL_SUITE ?? '').toLowerCase() === 'true') {
    await rm(listPath, { force: true });
    return {
      mode: 'all', specs: [], skipped: [], reason: 'PLAYWRIGHT_FULL_SUITE requested the full suite.',
    };
  }

  let changedFiles;
  let via;

  // Pull request runs list files through the GitHub API
  if (env.GITHUB_TOKEN && env.GITHUB_REPOSITORY && /^\d+$/.test(String(env.PR_NUMBER ?? ''))) {
    try {
      changedFiles = await listPullRequestFiles({
        apiUrl: env.GITHUB_API_URL || DEFAULT_API_URL,
        repository: env.GITHUB_REPOSITORY,
        prNumber: env.PR_NUMBER,
        token: env.GITHUB_TOKEN,
        fetchImpl,
      });
      via = `GitHub API (pull request #${env.PR_NUMBER})`;
    } catch (error) {
      warn(`Cannot list pull request files via the GitHub API (${error?.message || 'request failed'}); falling back to git diff.`);
    }
  }

  if (!changedFiles) {
    const base = baseRef || env.PLAYWRIGHT_DIFF_BASE || DEFAULT_BASE_REF;
    try {
      changedFiles = listChangedFiles(base, cwd);
      via = `git diff against ${base}`;
    } catch (error) {
      await rm(listPath, { force: true });
      return {
        mode: 'all',
        specs: [],
        skipped: [],
        reason: `Cannot determine changed files (${error?.message || 'git error'}); running the full suite.`,
      };
    }
  }

  const result = computeAffectedSpecs(
    changedFiles,
    (block) => findBlockSpecs(block, cwd),
  );

  if (result.mode === 'all') {
    await rm(listPath, { force: true });
    return { ...result, via, reason: 'Changed files include shared code; running the full suite.' };
  }

  await writeFile(listPath, buildTestListContent(result.specs, via || 'unknown'), 'utf8');
  return { ...result, via };
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  // Stdout carries only key=value lines so the workflow can append it to
  // $GITHUB_OUTPUT. Human-readable logs go to stderr.
  const result = await resolveAffectedTests({ baseRef: process.argv[2] });

  if (result.reason) warn(result.reason);
  for (const block of result.skipped) {
    warn(`Block '${block}' changed but has no spec (${blockToSpec(block)}); nothing to run for it.`);
  }
  warn(result.mode === 'all'
    ? 'Running the full Playwright suite.'
    : `Running ${result.specs.length} affected spec(s): ${result.specs.join(', ') || '(none)'}`);
  if (result.via) warn(`Changed files were determined via ${result.via}.`);

  process.stdout.write(`mode=${result.mode}\n`);
  process.stdout.write(`count=${result.specs.length}\n`);
}
