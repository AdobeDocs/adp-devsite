import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const devDocsPath = '/dev-docs-reference/blocks/edition/';
const devBizPath = '/tools/sidekick/blocks/edition';
const labelColor = 'rgb(255, 255, 255)';
const labelFontSize = '12px';
const devDocsExamples = [
  {
    name: 'default red text',
    label: 'PaaS Only',
    backgroundColor: 'rgb(187, 2, 2)',
    snapshot: 'edition-devdocs-default-red.png',
  },
  {
    name: 'blue text',
    label: 'Enterprise Edition',
    backgroundColor: 'rgb(4, 105, 227)',
    backgroundAttribute: 'blue',
    snapshot: 'edition-devdocs-blue.png',
  },
  {
    name: 'green text',
    label: 'Premium Edition',
    backgroundColor: 'rgb(0, 128, 0)',
    backgroundAttribute: 'green',
    snapshot: 'edition-devdocs-green.png',
  },
  {
    name: 'gray link',
    label: 'Gray Edition',
    backgroundColor: 'rgb(71, 71, 71)',
    backgroundAttribute: 'gray',
    href: 'https://example.com/editions',
    snapshot: 'edition-devdocs-gray-link.png',
  },
  {
    name: 'default red link',
    label: 'Enterprise Edition',
    backgroundColor: 'rgb(187, 2, 2)',
    href: 'https://example.com/editions',
    snapshot: 'edition-devdocs-default-red-link.png',
  },
];
const devBizVariants = [
  {
    name: 'default red',
    selector: '.edition.block:not(.background-color-blue)',
    backgroundColor: 'rgb(187, 2, 2)',
    snapshot: 'edition-devbiz-default-red.png',
  },
  {
    name: 'blue class fallback',
    selector: '.edition.block.background-color-blue',
    backgroundColor: 'rgb(4, 105, 227)',
    snapshot: 'edition-devbiz-blue.png',
  },
];

function editionContent(block) {
  return block.locator(':scope > div > div');
}

function getDevDocsEdition(page, example) {
  if (example.backgroundAttribute) {
    return page.locator(`.edition.block[data-backgroundcolor="${example.backgroundAttribute}"]`);
  }
  if (example.href) {
    return page.locator('.edition.block').filter({
      has: page.getByRole('link', { name: example.label, exact: true }),
    });
  }
  return page.locator('.edition.block').filter({
    has: page.getByText(example.label, { exact: true }),
  });
}

async function openDevDocsEditionPage(page) {
  await openDevDocsReferencePage(page, {
    path: devDocsPath,
    heading: 'Edition Block',
  });

  // The five examples decorate asynchronously; their loaded states are the
  // readiness signal, rather than the authored page heading.
  await expect(page.locator('.edition.block')).toHaveCount(devDocsExamples.length);
  await expect(page.locator('.edition.block[data-block-status="loaded"]'))
    .toHaveCount(devDocsExamples.length);
}

async function expectDevDocsEdition(page, example, { assertLink = true } = {}) {
  const block = getDevDocsEdition(page, example);
  const content = editionContent(block);

  await expect(block, `${example.name} example should be unique`).toHaveCount(1);
  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  if (example.backgroundAttribute) {
    await expect(block).toHaveAttribute('data-backgroundcolor', example.backgroundAttribute);
  } else {
    await expect(block).not.toHaveAttribute('data-backgroundcolor');
  }

  await expect(content).toHaveText(example.label);
  await expect(content).toHaveCSS('background-color', example.backgroundColor);
  await expect(content).toHaveCSS('color', labelColor);
  await expect(content).toHaveCSS('font-size', labelFontSize);

  if (example.href && assertLink) {
    const link = block.getByRole('link', { name: example.label, exact: true });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', example.href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }

  return block;
}

async function openDevBizEditionPage(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  // The two examples have the same text, so their distinct class contracts
  // identify the default and class-based color fallback variants.
  await expect(page.locator('.edition.block')).toHaveCount(devBizVariants.length);
  await expect(page.locator('.edition.block[data-block-status="loaded"]'))
    .toHaveCount(devBizVariants.length);
  await expect(page.locator('.edition.block.background-color-blue')).toHaveCount(1);
  await expect(page.locator('.edition.block:not(.background-color-blue)')).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
}

async function expectDevBizEdition(page, variant) {
  const block = page.locator(variant.selector);
  const content = editionContent(block);
  const link = block.getByRole('link', { name: 'Learn more', exact: true });

  await expect(block, `${variant.name} example should be unique`).toHaveCount(1);
  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  await expect(content).toContainText('Adobe DevSite only.');
  await expect(content).toContainText('Learn more');
  await expect(content).toHaveCSS('background-color', variant.backgroundColor);
  await expect(content).toHaveCSS('color', labelColor);
  await expect(content).toHaveCSS('font-size', labelFontSize);

  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://developer.adobe.com/');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).not.toHaveAttribute('title');

  return block;
}

test.describe('Edition DevDocs reference', () => {
  test.beforeEach(async ({ page }) => openDevDocsEditionPage(page));

  test('decorates every documented color and text variant', async ({ page }) => {
    for (const example of devDocsExamples) {
      await expectDevDocsEdition(page, example, { assertLink: false });
    }
  });

  test('decorates documented links as safe external destinations', async ({ page }) => {
    for (const example of devDocsExamples.filter(({ href }) => href)) {
      await expectDevDocsEdition(page, example);
    }
  });

  test('matches each documented Edition visual', async ({ page }) => {
    await hideNonComponentContent(page);

    for (const example of devDocsExamples) {
      const block = await expectDevDocsEdition(page, example);
      await expect(editionContent(block)).toHaveScreenshot(example.snapshot);
    }
  });
});

test.describe('Edition DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openDevBizEditionPage(page));

  test('supports the default and class-based color variants with safe links', async ({ page }) => {
    for (const variant of devBizVariants) {
      await expectDevBizEdition(page, variant);
    }
  });

  test('matches each DevBiz Edition visual', async ({ page }) => {
    await hideNonComponentContent(page);

    for (const variant of devBizVariants) {
      const block = await expectDevBizEdition(page, variant);
      await expect(editionContent(block)).toHaveScreenshot(variant.snapshot);
    }
  });
});
