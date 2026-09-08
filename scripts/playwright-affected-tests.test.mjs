import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  blockToSpec,
  buildTestListContent,
  classifyChangedFile,
  computeAffectedSpecs,
} from './playwright-affected-tests.mjs';

const scriptPath = fileURLToPath(new URL('./playwright-affected-tests.mjs', import.meta.url));

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(path.join(tmpdir(), 'playwright-affected-tests-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function commitFile(cwd, file, content, message) {
  const absolute = path.join(cwd, file);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  git(cwd, ['add', file]);
  git(cwd, ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', message]);
}

async function withGitRepository(callback) {
  return withTemporaryDirectory(async (directory) => {
    git(directory, ['init', '-b', 'main']);
    await commitFile(directory, 'README.md', '# fixture\n', 'initial commit');
    return callback(directory);
  });
}

function runScript(cwd, args = [], env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 10_000,
  });
}

test('classifyChangedFile maps block sources to their block', () => {
  assert.deepEqual(classifyChangedFile('hlx_statics/blocks/banner/banner.js'), { type: 'block', block: 'banner' });
  assert.deepEqual(classifyChangedFile('hlx_statics/blocks/banner/banner.css'), { type: 'block', block: 'banner' });
});

test('classifyChangedFile maps specs and their snapshots to their block', () => {
  assert.deepEqual(classifyChangedFile('tests/playwright/blocks/banner.spec.mjs'), { type: 'spec', block: 'banner' });
  assert.deepEqual(classifyChangedFile('tests/playwright/blocks/banner.spec.mjs-snapshots/banner.png'), { type: 'spec', block: 'banner' });
});

test('classifyChangedFile treats shared site assets and test infrastructure as shared', () => {
  for (const file of [
    'hlx_statics/scripts/scripts.js',
    'hlx_statics/styles/styles.css',
    'hlx_statics/icons/close.svg',
    'hlx_statics/blocks/README.md',
    'tests/playwright/helpers.mjs',
    'playwright.config.mjs',
    'package.json',
    'package-lock.json',
    '.github/workflows/playwright.yml',
  ]) {
    assert.deepEqual(classifyChangedFile(file), { type: 'shared' }, file);
  }
});

test('classifyChangedFile ignores files unrelated to Playwright', () => {
  assert.deepEqual(classifyChangedFile('README.md'), { type: 'unrelated' });
  assert.deepEqual(classifyChangedFile('test/blocks/banner.test.js'), { type: 'unrelated' });
  assert.deepEqual(classifyChangedFile(''), { type: 'unrelated' });
});

test('computeAffectedSpecs dedupes and sorts specs for changed blocks', () => {
  const result = computeAffectedSpecs([
    'hlx_statics/blocks/banner/banner.js',
    'hlx_statics/blocks/banner/banner.css',
    'hlx_statics/blocks/accordion/accordion.js',
    'tests/playwright/blocks/banner.spec.mjs-snapshots/banner.png',
  ]);
  assert.deepEqual(result, {
    mode: 'subset',
    specs: [
      'tests/playwright/blocks/accordion.spec.mjs',
      'tests/playwright/blocks/banner.spec.mjs',
    ],
    skipped: [],
  });
});

test('computeAffectedSpecs skips blocks without an existing spec', () => {
  const result = computeAffectedSpecs(
    ['hlx_statics/blocks/banner/banner.js'],
    () => false,
  );
  assert.deepEqual(result, { mode: 'subset', specs: [], skipped: ['banner'] });
});

test('computeAffectedSpecs selects the full suite when shared files change', () => {
  const result = computeAffectedSpecs([
    'hlx_statics/blocks/banner/banner.js',
    'hlx_statics/scripts/scripts.js',
  ]);
  assert.deepEqual(result, { mode: 'all', specs: [], skipped: [] });
});

test('computeAffectedSpecs returns an empty subset for unrelated changes', () => {
  const result = computeAffectedSpecs(['README.md', 'docs/research/notes.md']);
  assert.deepEqual(result, { mode: 'subset', specs: [], skipped: [] });
});

test('buildTestListContent lists specs relative to the Playwright rootDir', () => {
  const content = buildTestListContent(['tests/playwright/blocks/banner.spec.mjs'], 'origin/main');
  assert.match(content, /^#.*scripts\/playwright-affected-tests\.mjs/);
  assert.match(content, /# Changed files were diffed against origin\/main\./);
  assert.ok(content.trimEnd().endsWith('blocks/banner.spec.mjs'));
  assert.doesNotMatch(content, /^tests\/playwright/m);
});

test('blockToSpec follows the tests/playwright/blocks naming convention', () => {
  assert.equal(blockToSpec('banner'), 'tests/playwright/blocks/banner.spec.mjs');
});

test('cli falls back to the full suite when the base ref cannot be diffed', async () => {
  await withTemporaryDirectory((directory) => {
    const result = runScript(directory, ['origin/does-not-exist']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^mode=all$/m);
    assert.match(result.stdout, /^count=0$/m);
    assert.match(result.stderr, /Cannot diff against 'origin\/does-not-exist'/);
  });
});

test('cli honors PLAYWRIGHT_FULL_SUITE', async () => {
  await withGitRepository(async (directory) => {
    const result = runScript(directory, [], { PLAYWRIGHT_FULL_SUITE: 'true' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^mode=all$/m);
    assert.match(result.stderr, /full suite/i);
  });
});

test('cli writes a test list for changed blocks that have a spec', async () => {
  await withGitRepository(async (directory) => {
    await commitFile(directory, 'tests/playwright/blocks/banner.spec.mjs', '// spec\n', 'add banner spec');
    git(directory, ['checkout', '-b', 'feature']);
    await commitFile(directory, 'hlx_statics/blocks/banner/banner.js', '// block\n', 'change banner block');
    await commitFile(directory, 'hlx_statics/blocks/footer/footer.js', '// block\n', 'change footer block');

    const result = runScript(directory, ['main']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^mode=subset$/m);
    assert.match(result.stdout, /^count=1$/m);
    assert.match(result.stderr, /Block 'footer' changed but has no spec/);

    const list = await readFile(path.join(directory, 'playwright-affected-tests.txt'), 'utf8');
    assert.match(list, /^blocks\/banner\.spec\.mjs$/m);
    assert.doesNotMatch(list, /footer\.spec\.mjs/);
  });
});

test('cli writes an empty test list for unrelated changes', async () => {
  await withGitRepository(async (directory) => {
    git(directory, ['checkout', '-b', 'feature']);
    await commitFile(directory, 'CONTRIBUTING.md', 'docs\n', 'docs change');

    const result = runScript(directory, ['main']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^mode=subset$/m);
    assert.match(result.stdout, /^count=0$/m);

    const list = await readFile(path.join(directory, 'playwright-affected-tests.txt'), 'utf8');
    assert.ok(list.split('\n').every((line) => !line || line.startsWith('#')));
  });
});

test('cli selects the full suite when shared files change', async () => {
  await withGitRepository(async (directory) => {
    git(directory, ['checkout', '-b', 'feature']);
    await commitFile(directory, 'hlx_statics/styles/styles.css', 'body {}\n', 'style change');

    const result = runScript(directory, ['main']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^mode=all$/m);
    assert.match(result.stderr, /shared code/);
  });
});
