import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const basePath = '/dev-docs-reference/blocks/code';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

function directCodeBlock(page, text) {
  return page.locator('.code.block').filter({ hasText: text });
}

function nestedCodeBlock(page, text) {
  return page.locator('.nested-code-wrapper').filter({ hasText: text });
}

async function openCodeReferencePage(page, {
  path,
  heading,
  directCodeCount,
}) {
  await openDevDocsReferencePage(page, { path, heading });

  // Code blocks complete their own decoration before Prism adds toolbars and
  // generated line-number markup. Wait for both signals before asserting a
  // documented example or comparing its pixels.
  const directBlocks = page.locator('.code.block[data-block-status="loaded"]');
  await expect(directBlocks).toHaveCount(directCodeCount);
  await expect(directBlocks.locator('.code-toolbar')).toHaveCount(directCodeCount);

  return directBlocks;
}

async function expectCopyToolbar(block) {
  await expect(block.locator('.code-toolbar')).toHaveCount(1);
  await expect(block.getByRole('button', { name: 'Copy', exact: true })).toHaveCount(1);
}

async function expectCodeDirective(block, {
  language,
  dataLine,
  lineNumberCount,
  noLineNumbers = false,
  highlightedRanges = [],
}) {
  await expect(block).toHaveCount(1);
  await expectCopyToolbar(block);

  const pre = block.locator('pre');
  const code = block.locator('code');
  await expect(pre).toHaveCount(1);
  await expect(code).toHaveCount(1);
  await expect(pre).toHaveClass(new RegExp(`(^|\\s)language-${language}(\\s|$)`));
  await expect(code).toHaveClass(new RegExp(`(^|\\s)language-${language}(\\s|$)`));

  if (dataLine) {
    await expect(pre).toHaveAttribute('data-line', dataLine);
    await expect(code).toHaveAttribute('data-line', dataLine);
    await expect(code).not.toHaveClass(/data-line/);
  } else {
    await expect(pre).not.toHaveAttribute('data-line');
    await expect(code).not.toHaveAttribute('data-line');
  }

  if (noLineNumbers) {
    await expect(pre).toHaveClass(/\bdisableLineNumbers\b/);
    await expect(pre).toHaveClass(/\bno-line-numbers\b/);
    await expect(pre).not.toHaveClass(/(^|\s)line-numbers(\s|$)/);
    await expect(pre.locator('.line-numbers-rows')).toHaveCount(0);
  } else {
    await expect(pre).toHaveClass(/\bline-numbers\b/);
    await expect(pre.locator('.line-numbers-rows > span')).toHaveCount(lineNumberCount);
  }

  await expect(pre.locator('.line-highlight')).toHaveCount(highlightedRanges.length);
  for (const range of highlightedRanges) {
    await expect(pre.locator(`.line-highlight[data-range="${range}"]`)).toHaveCount(1);
  }
}

async function expectCodeScreenshot(page, block, name) {
  await page.evaluate(() => document.fonts.ready);
  await hideNonComponentContent(page);
  await expect(block).toHaveScreenshot(name);
}

test.describe('Code reference overview', () => {
  test('decorates the documented highlighted and no-line-number examples', async ({ page }) => {
    await openCodeReferencePage(page, {
      path: `${basePath}/`,
      heading: 'Code',
      directCodeCount: 5,
    });

    const highlightedExample = page.locator('.code.block').filter({
      has: page.locator('pre[data-line="2,4"]'),
    });
    await expectCodeDirective(highlightedExample, {
      language: 'javascript',
      dataLine: '2,4',
      lineNumberCount: 5,
      highlightedRanges: ['2', '4'],
    });
    const noLineNumberExample = page.locator('.code.block').filter({
      has: page.locator('pre.no-line-numbers.language-bash'),
    });
    await expectCodeDirective(noLineNumberExample, {
      language: 'bash',
      noLineNumbers: true,
    });
  });
});

test.describe('Basic Code Block reference', () => {
  test.beforeEach(async ({ page }) => openCodeReferencePage(page, {
    path: `${basePath}/code-basic`,
    heading: 'Basic Code Block',
    directCodeCount: 4,
  }));

  test('decorates basic typed and untyped code with syntax-ready presentation', async ({ page }) => {
    const untyped = directCodeBlock(page, '```javascript\nconst message');
    const apiRequest = directCodeBlock(page, "curl -i -X POST 'https://api.example.com/graphql'");
    const commands = directCodeBlock(page, 'npm install\nnpm start');
    const javascript = directCodeBlock(page, 'function greet(name) {');

    await expectCodeDirective(untyped, {
      language: 'none',
      lineNumberCount: 3,
    });
    await expectCodeDirective(apiRequest, {
      language: 'bash',
      lineNumberCount: 4,
    });
    await expectCodeDirective(commands, {
      language: 'bash',
      lineNumberCount: 2,
    });
    await expectCodeDirective(javascript, {
      language: 'javascript',
      lineNumberCount: 5,
    });
    await expect(javascript.locator('code .token.keyword').filter({ hasText: 'function' }))
      .toBeVisible();
  });

  test('matches the standard JavaScript code visual', async ({ page }) => {
    const javascript = directCodeBlock(page, 'function greet(name) {');

    await expectCodeDirective(javascript, {
      language: 'javascript',
      lineNumberCount: 5,
    });
    await expect(javascript.locator('code .token.keyword').filter({ hasText: 'function' }))
      .toBeVisible();
    await expectCodeScreenshot(page, javascript, 'code-basic-javascript.png');
  });
});

test.describe('Basic Code Block clipboard', () => {
  test('copies a code sample and exposes the copy success state', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(baseURL).origin,
    });
    await openCodeReferencePage(page, {
      path: `${basePath}/code-basic`,
      heading: 'Basic Code Block',
      directCodeCount: 4,
    });

    const javascript = page.locator('.code.block').filter({
      has: page.locator('pre.language-javascript'),
    });
    const code = javascript.locator('code');
    const button = javascript.getByRole('button', { name: 'Copy', exact: true });
    const expectedCode = await code.textContent();

    // The fixture resets the transient success label after three seconds. Record
    // its attribute transition so browser scheduling cannot skip the assertion.
    await button.evaluate((element) => {
      new MutationObserver(() => {
        if (element.getAttribute('data-copy-state') === 'copy-success') {
          element.copySuccessText = element.textContent;
        }
      }).observe(element, { attributes: true, attributeFilter: ['data-copy-state'] });
    });
    await button.click();

    await expect.poll(() => button.evaluate((element) => element.copySuccessText))
      .toBe('Copied to your clipboard');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expectedCode);
  });
});

test.describe('Code with Highlighted Lines reference', () => {
  test.beforeEach(async ({ page }) => openCodeReferencePage(page, {
    path: `${basePath}/code-highlighted-line`,
    heading: 'Code with Highlighted Lines',
    directCodeCount: 2,
  }));

  test('supports range and individual line highlighting', async ({ page }) => {
    await expectCodeDirective(directCodeBlock(page, 'function processData(input) {'), {
      language: 'javascript',
      dataLine: '2-3,6',
      lineNumberCount: 10,
      highlightedRanges: ['2-3', '6'],
    });
  });

  test('matches the highlighted-lines visual', async ({ page }) => {
    const code = directCodeBlock(page, 'function processData(input) {');

    await expectCodeDirective(code, {
      language: 'javascript',
      dataLine: '2-3,6',
      lineNumberCount: 10,
      highlightedRanges: ['2-3', '6'],
    });
    await expectCodeScreenshot(page, code, 'code-highlighted-lines.png');
  });
});

test.describe('Code Overload reference', () => {
  test.beforeEach(async ({ page }) => openCodeReferencePage(page, {
    path: `${basePath}/code-overload`,
    heading: 'Code Overload Example',
    directCodeCount: 4,
  }));

  test('combines line highlighting with enabled and disabled line numbers', async ({ page }) => {
    await expectCodeDirective(directCodeBlock(page, 'function calculateTotal(items) {'), {
      language: 'javascript',
      dataLine: '2-3',
      noLineNumbers: true,
      highlightedRanges: ['2-3'],
    });
    await expectCodeDirective(directCodeBlock(page, 'def process_data(data):'), {
      language: 'python',
      dataLine: '2-3',
      lineNumberCount: 4,
      highlightedRanges: ['2-3'],
    });
    await expectCodeDirective(directCodeBlock(page, '# Install dependencies\nnpm install'), {
      language: 'bash',
      dataLine: '3,5',
      noLineNumbers: true,
      highlightedRanges: ['3', '5'],
    });
  });

  test('matches the highlighted no-line-numbers visual', async ({ page }) => {
    const code = directCodeBlock(page, 'function calculateTotal(items) {');

    await expectCodeDirective(code, {
      language: 'javascript',
      dataLine: '2-3',
      noLineNumbers: true,
      highlightedRanges: ['2-3'],
    });
    await expectCodeScreenshot(page, code, 'code-overload-no-line-numbers.png');
  });
});

test.describe('Code in Lists reference', () => {
  test.beforeEach(async ({ page }) => openCodeReferencePage(page, {
    path: `${basePath}/code-in-list`,
    heading: 'Code in Lists',
    directCodeCount: 1,
  }));

  test('decorates code nested in ordered-list items', async ({ page }) => {
    const nestedBlocks = page.locator('ol li .nested-code-wrapper');
    await expect(nestedBlocks).toHaveCount(5);

    const examples = [
      { text: 'node --version\nnpm --version', lineNumberCount: 2 },
      { text: 'git clone https://github.com/example/project.git', lineNumberCount: 2 },
      { text: 'npm install', lineNumberCount: 1 },
      { text: 'cp .env.example .env', lineNumberCount: 1 },
      { text: 'npm run dev', lineNumberCount: 1 },
    ];
    for (const example of examples) {
      await expectCodeDirective(nestedCodeBlock(page, example.text), {
        language: 'bash',
        lineNumberCount: example.lineNumberCount,
      });
    }
  });

  test('matches the nested-list-code visual', async ({ page }) => {
    const code = nestedCodeBlock(page, 'node --version\nnpm --version');

    await expectCodeDirective(code, {
      language: 'bash',
      lineNumberCount: 2,
    });
    await expectCodeScreenshot(page, code, 'code-in-list-nested.png');
  });
});

test.describe('Code in Tables reference', () => {
  test('preserves inline table code without promoting it to a Code block', async ({ page }) => {
    await openCodeReferencePage(page, {
      path: `${basePath}/code-in-table`,
      heading: 'Code in Tables',
      directCodeCount: 1,
    });

    const table = page.locator('.table.block[data-block-status="loaded"]');
    await expect(table).toHaveCount(1);
    await expect(table.locator('code.inline-code')).toHaveCount(10);
    for (const name of ['id', 'username', 'createdAt', 'isActive']) {
      await expect(table.locator('code.inline-code').filter({ hasText: name })).toHaveCount(1);
    }
    await expect(table.locator('pre, .code-toolbar, .line-numbers-rows, .line-highlight'))
      .toHaveCount(0);
  });
});
