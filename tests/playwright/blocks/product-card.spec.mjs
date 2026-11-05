import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const devDocsPath = '/dev-docs-reference/blocks/product-card/';
const devBizPath = '/tools/sidekick/blocks/product-card';
const devBizHeading = 'Lorem ipsum dolor sit amet consectetur';
const destination = 'https://developer.adobe.com/';

function cardsIn(block) {
  return block.locator(':scope > div.spectrum-Card.spectrum-Card--sizeM');
}

async function expectColumns(block, count) {
  await expect.poll(() => block.evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ))).toBe(count);
}

async function expectImagesLoaded(block, count) {
  const images = block.locator('img');
  await expect(images).toHaveCount(count);
  await block.scrollIntoViewIfNeeded();
  await expect.poll(() => images.evaluateAll((elements, expectedCount) => (
    elements.length === expectedCount
      && elements.every((image) => image.complete && image.naturalWidth > 0)
  ), count)).toBe(true);
}

async function openDevDocsProductCard(page) {
  await openDevDocsReferencePage(page, {
    path: devDocsPath,
    heading: 'Product Card Block',
  });
  const block = page.locator('.product-card.block');
  await expect(block).toHaveCount(1);
  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  await expect(cardsIn(block)).toHaveCount(2);
  return block;
}

test.describe('Product Card DevDocs reference', () => {
  test('moves authored links into card footers and accents only the second link', async ({ page }) => {
    const block = await openDevDocsProductCard(page);
    const cards = cardsIn(block);

    await expect(block).toHaveClass(/\bbackground-color-white\b/);
    await expect(block).toHaveCSS('--grid-columns', '2');
    await expect(block).toHaveCSS('--grid-columns-tablet', '2');
    await expectColumns(block, 2);
    for (const [index, names] of [[0, ['Learn more', 'View Docs']], [1, ['Learn more']]]) {
      const card = cards.nth(index);
      const body = card.locator(':scope > .spectrum-Card-body');
      const footer = card.locator(':scope > .spectrum-Card-footer');
      const buttons = footer.locator(':scope > .all-button-container > a');

      await expect(body).toHaveCount(1);
      await expect(footer).toHaveCount(1);
      await expect(body.getByRole('link')).toHaveCount(0);
      await expect(body.locator('img')).toHaveAttribute('alt', 'Product Icon');
      await expect(body).toContainText(`sample description for the ${index === 0 ? 'first' : 'second'} product card`);
      await expect(buttons).toHaveText(names);
      for (const [buttonIndex, name] of names.entries()) {
        const button = footer.getByRole('link', { name, exact: true });
        await expect(button).toHaveAttribute('href', destination);
        await expect(button).toHaveClass(/\bspectrum-Button--outline\b/);
        await expect(button).toHaveClass(new RegExp(`\\bspectrum-Button--${buttonIndex === 1 ? 'accent' : 'secondary'}\\b`));
      }
      if (index === 1) await expect(footer.locator('.spectrum-Button--accent')).toHaveCount(0);
    }
  });

  test('matches the two-card block visual', async ({ page }) => {
    const block = await openDevDocsProductCard(page);
    await expect(block).toHaveClass(/\bbackground-color-white\b/);
    await expectColumns(block, 2);
    await expect(block.locator('.spectrum-Card-footer a')).toHaveCount(3);
    await expectImagesLoaded(block, 2);
    await page.evaluate(() => document.fonts.ready);
    await hideNonComponentContent(page);
    await expect(block).toHaveScreenshot('product-card-devdocs.png');
  });
});

// Authored DevBiz order is part of the fixture contract: default, white, narrow.
// This page exercises the DevBiz-only <strong> accent path and its authored variants.
const devBizVariants = [
  { name: 'default', index: 0, snapshot: 'product-card-devbiz-default.png' },
  {
    name: 'white background', index: 1, className: 'background-color-white',
    snapshot: 'product-card-devbiz-white.png',
  },
  {
    name: 'narrow', index: 2, className: 'narrow',
    snapshot: 'product-card-devbiz-narrow.png',
  },
];

function devBizBlock(page, variant) {
  // Only call after openDevBizProductCards validates the count and identity of every index.
  return page.locator('.product-card.block').nth(variant.index);
}

async function openDevBizProductCards(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  const blocks = page.locator('.product-card.block');
  await expect(blocks).toHaveCount(devBizVariants.length);
  await expect(page.locator('.product-card.block[data-block-status="loaded"]'))
    .toHaveCount(devBizVariants.length);
  for (const variant of devBizVariants) {
    const block = blocks.nth(variant.index);
    await expect(cardsIn(block), `${variant.name} card count`).toHaveCount(3);
    await expect(block.getByRole('heading', { name: devBizHeading, exact: true }))
      .toHaveCount(3);
    if (variant.className) {
      await expect(block).toHaveClass(new RegExp(`\\b${variant.className}\\b`));
    } else {
      await expect(block).not.toHaveClass(/\b(background-color-white|narrow)\b/);
    }
  }
}

test.describe('Product Card DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openDevBizProductCards(page));

  test('keeps three columns and maps authored strong links to accent buttons', async ({ page }) => {
    for (const variant of devBizVariants) {
      const block = devBizBlock(page, variant);
      await expect(block).toHaveCSS('--grid-columns', '3');
      await expect(block).toHaveCSS('--grid-columns-tablet', '2');
      await expectColumns(block, 3);
      await expect(block.locator('.title-heading')).toHaveCount(3);
      for (const card of await cardsIn(block).all()) {
        const body = card.locator(':scope > .spectrum-Card-body');
        const footer = card.locator(':scope > .spectrum-Card-footer');
        await expect(body).toHaveCount(1);
        await expect(footer).toHaveCount(1);
        await expect(body.getByRole('link')).toHaveCount(0);
        await expect(footer.locator('.all-button-container .button-container')).toHaveCount(2);
        const secondary = footer.getByRole('link', { name: 'Learn more', exact: true });
        const accent = footer.getByRole('link', { name: 'View docs', exact: true });
        await expect(secondary).toHaveClass(/\bspectrum-Button--secondary\b/);
        await expect(accent).toHaveClass(/\bspectrum-Button--accent\b/);
        await expect(accent.locator('..')).toHaveJSProperty('tagName', 'STRONG');
        await expect(secondary).toHaveAttribute('href', destination);
        await expect(accent).toHaveAttribute('href', destination);
      }
    }
    await expect(devBizBlock(page, devBizVariants[1]).locator('..'))
      .toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(devBizBlock(page, devBizVariants[2])).toHaveCSS('max-width', '1000px');
    await expect(devBizBlock(page, devBizVariants[2])).toHaveCSS('width', '1000px');
  });

  for (const variant of devBizVariants) {
    test(`matches the ${variant.name} visual`, async ({ page }) => {
      const block = devBizBlock(page, variant);
      await expectColumns(block, 3);
      await expect(block.locator('.title-heading')).toHaveCount(3);
      await expect(block.locator('.spectrum-Button--accent')).toHaveCount(3);
      if (variant.className) {
        await expect(block).toHaveClass(new RegExp(`\\b${variant.className}\\b`));
      }
      await expectImagesLoaded(block, 3);
      await page.evaluate(() => document.fonts.ready);
      await hideNonComponentContent(page);
      // Fixed site navigation can overlap a component capture after scrolling.
      await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
      await expect(block.locator('..')).toHaveScreenshot(variant.snapshot);
    });
  }
});
