import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const standardPath = '/dev-docs-reference/blocks/cards/';
const widePath = '/dev-docs-reference/blocks/cards/cards-wide';
const imageAsset = 'media_1f5704f18d579bbfb8234b074a2cd826828bafb48.jpg';
const cards = [
  {
    heading: 'First Card',
    description: 'This is a sample description for the first card in the grid.',
  },
  {
    heading: 'Second Card',
    description: 'This is a sample description for the second card in the grid.',
  },
  {
    heading: 'Third Card',
    description: 'This is a sample description for the third card in the grid.',
  },
];

function getCard(page, heading) {
  return page.locator('.cards.block').filter({
    has: page.getByRole('heading', { name: heading, exact: true }),
  });
}

async function openCardsReferencePage(page, { path, heading }) {
  await openDevDocsReferencePage(page, { path, heading });

  // Each example is a separately authored one-card block. Loaded status proves
  // that the block decoration completed, not just that the page heading loaded.
  await expect(page.locator('.cards.block')).toHaveCount(cards.length);
  await expect(page.locator('.cards.block[data-block-status="loaded"]')).toHaveCount(cards.length);
}

async function expectCardImageLoaded(block) {
  const image = block.locator('img');

  await expect(image).toHaveCount(1);
  // Cards optimize images when their block intersects the viewport; scrolling
  // also triggers the fixture's lazy-loaded image before checking pixels.
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (
    element.complete && element.naturalWidth > 0
  ))).toBe(true);

  return image;
}

async function expectCardsBehavior(page, { wide = false } = {}) {
  for (const cardExample of cards) {
    const block = getCard(page, cardExample.heading);

    await expect(block).toHaveCount(1);
    await expect(block).toHaveAttribute('data-block-status', 'loaded');
    await expect(block).toHaveAttribute('data-slots', /image,\s*heading,\s*text,\s*links/);
    await expect(block).toHaveAttribute('data-width', '33%');
    await expect.poll(() => block.evaluate((element) => element.parentElement.style.width))
      .toBe('33%');

    if (wide) {
      await expect(block).toHaveAttribute('data-variant', 'wide');
      await expect(block).toHaveClass(/\bwide\b/);
    } else {
      await expect(block).not.toHaveClass(/\bwide\b/);
    }

    await expect(block.getByRole('heading', {
      level: 3,
      name: cardExample.heading,
      exact: true,
    })).toBeVisible();
    await expect(block).toContainText(cardExample.description);

    const image = await expectCardImageLoaded(block);
    await expect(image).toHaveAttribute('alt', 'Card Image');
    await expect(image).toHaveAttribute('src', new RegExp(imageAsset));
    await expect(image).toHaveCSS('height', wide ? '200px' : '80px');

    await expect(block.getByRole('link', { name: 'Learn more', exact: true }))
      .toHaveAttribute('href', 'https://developer.adobe.com/');
  }
}

async function expectCardsScreenshot(page, { wide = false } = {}) {
  await expect(page.locator('.cards.block[data-block-status="loaded"]')).toHaveCount(cards.length);
  for (const cardExample of cards) {
    const block = getCard(page, cardExample.heading);
    await expect(block).toHaveAttribute('data-width', '33%');
    await expect(block.getByRole('heading', { name: cardExample.heading, exact: true }))
      .toHaveClass(/card-heading/);
    if (wide) {
      await expect(block).toHaveClass(/\bwide\b/);
    } else {
      await expect(block).not.toHaveClass(/\bwide\b/);
    }
    await expectCardImageLoaded(block);
  }
  await page.evaluate(() => document.fonts.ready);
  await hideNonComponentContent(page);

  // The three cards are separate sibling blocks inside a documentation section.
  // Clip to their contiguous wrappers so the baseline captures the entire grid
  // without the syntax/prose above it or the next-prev block below it.
  const wrappers = page.locator('main .cards-wrapper');
  await expect(wrappers).toHaveCount(cards.length);
  await wrappers.first().scrollIntoViewIfNeeded();
  const first = await wrappers.first().boundingBox();
  const last = await wrappers.last().boundingBox();
  if (!first || !last) throw new Error('Cards grid wrappers have no bounding box');

  await expect(page).toHaveScreenshot(wide ? 'cards-wide-grid.png' : 'cards-standard-grid.png', {
    clip: {
      x: first.x,
      y: first.y,
      width: last.x + last.width - first.x,
      height: Math.max(first.height, last.height),
    },
  });
}

test.describe('Cards reference', () => {
  test.beforeEach(async ({ page }) => openCardsReferencePage(page, {
    path: standardPath,
    heading: 'Cards Block',
  }));

  test('decorates each standard one-card example with its content and destinations', async ({ page }) => {
    await expectCardsBehavior(page);
  });

  test('matches the standard three-card grid visual', async ({ page }) => {
    await expectCardsScreenshot(page);
  });
});

test.describe('Cards wide reference', () => {
  test.beforeEach(async ({ page }) => openCardsReferencePage(page, {
    path: widePath,
    heading: 'Cards - Wide Variant',
  }));

  test('decorates each wide one-card example with its variant and destinations', async ({ page }) => {
    await expectCardsBehavior(page, { wide: true });
  });

  // The current DevDocs fixture authors three separate 33% blocks, but wide
  // images expand each card beyond its wrapper and overlap neighboring text.
  // Do not bless that clipping with a baseline; enable after the layout is fixed.
  test.fixme('matches the wide three-card grid visual', async ({ page }) => {
    await expectCardsScreenshot(page, { wide: true });
  });
});

const devBizPath = '/tools/sidekick/blocks/cards';
const variants = [
  {
    name: 'default five-card gray',
    index: 0,
    cardCount: 5,
    imageCount: 5,
    firstHeading: 'Microsoft Teams',
    lastHeading: 'Slack',
    snapshot: 'cards-devbiz-default-gray.png',
  },
  {
    name: 'white-background three-card',
    index: 1,
    cardCount: 3,
    imageCount: 3,
    firstHeading: 'Microsoft Teams',
    className: 'background-color-white',
    snapshot: 'cards-devbiz-white-background.png',
  },
  {
    name: 'links-style three-card',
    index: 2,
    cardCount: 3,
    imageCount: 3,
    firstHeading: 'Microsoft Teams',
    className: 'links',
    snapshot: 'cards-devbiz-links.png',
  },
  {
    name: 'text-only three-card',
    index: 3,
    cardCount: 3,
    imageCount: 0,
    firstHeading: 'Lorem ipsum',
    snapshot: 'cards-devbiz-text-only.png',
  },
  {
    name: 'dark-gray text-only two-card',
    index: 4,
    cardCount: 2,
    imageCount: 0,
    firstHeading: 'Lorem ipsum',
    className: 'background-color-dark-gray',
    snapshot: 'cards-devbiz-dark-gray-text-only.png',
  },
  {
    name: 'wide-image three-card without CTA',
    index: 5,
    cardCount: 3,
    imageCount: 3,
    firstHeading: 'Microsoft Teams',
    className: 'wide',
    snapshot: 'cards-devbiz-wide-images-no-cta.png',
  },
  {
    name: 'start-aligned three-card with Jira Cloud buttons',
    index: 6,
    cardCount: 3,
    imageCount: 3,
    firstHeading: 'Microsoft Teams',
    className: 'start',
    snapshot: 'cards-devbiz-start-jira-cloud-buttons.png',
  },
];

function cardsIn(block) {
  return block.locator(':scope > div');
}

function blockAt(page, variant) {
  // The authored DevBiz fixture order is part of this positional locator contract.
  return page.locator('.cards.block').nth(variant.index);
}

async function openCardsPage(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  const blocks = page.locator('.cards.block');
  await expect(blocks).toHaveCount(variants.length);
  await expect(page.locator('.cards.block[data-block-status="loaded"]')).toHaveCount(variants.length);

  // Assert the identity and card count of every index before scenario locators use .nth().
  // The authored order is: default, white, links, text-only, dark-gray text-only, wide, start.
  for (const variant of variants) {
    const block = blocks.nth(variant.index);
    await expect(cardsIn(block), `${variant.name} should have ${variant.cardCount} cards`)
      .toHaveCount(variant.cardCount);
    await expect(block.locator('.card-heading')).toHaveCount(variant.cardCount);
    await expect(block.getByRole('heading', {
      name: variant.firstHeading,
      exact: true,
    }).first(), `${variant.name} should identify its authored first card`).toBeVisible();

    if (variant.lastHeading) {
      await expect(block.getByRole('heading', {
        name: variant.lastHeading,
        exact: true,
      }).last()).toBeVisible();
    }
    if (variant.className) {
      await expect(block).toHaveClass(new RegExp(`(^|\\s)${variant.className}(\\s|$)`));
    }
  }

  await page.evaluate(() => document.fonts.ready);
}

async function waitForCardImages(block, expectedCount) {
  const images = block.locator('img');
  await expect(images).toHaveCount(expectedCount);
  for (let index = 0; index < expectedCount; index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    await expect.poll(() => image.evaluate((element) => element.naturalWidth))
      .toBeGreaterThan(0);
  }
}

test.describe('Cards DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openCardsPage(page));

  test('decorates the default five-card gray variant with images, content, and buttons', async ({ page }) => {
    const block = blockAt(page, variants[0]);

    await expect(block.locator('..')).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await expect(block.locator('img')).toHaveCount(5);
    await expect(block.locator('.card-heading')).toHaveCount(5);
    const buttons = block.locator('.card-button.spectrum-Button--accent');
    await expect(buttons).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      await expect(buttons.nth(index)).toHaveAttribute('href', 'https://developer.adobe.com/');
    }
    await expect(block.locator('p.spectrum-Body')).toHaveCount(10);
  });

  test('uses a white background for the three-card variant', async ({ page }) => {
    const block = blockAt(page, variants[1]);

    await expect(block).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(block.locator('img')).toHaveCount(3);
    await expect(block.locator('.card-button')).toHaveCount(3);
  });

  test('decorates links-style cards as links rather than buttons', async ({ page }) => {
    const block = blockAt(page, variants[2]);

    const links = block.locator('a.spectrum-Link.spectrum-Button--secondary');
    await expect(links).toHaveCount(3);
    await expect(block.locator('a.card-button')).toHaveCount(0);
    for (let index = 0; index < 3; index += 1) {
      await expect(links.nth(index)).toHaveAttribute('href', 'https://developer.adobe.com/');
    }
  });

  test('renders the three-card text-only variant without images or links', async ({ page }) => {
    const block = blockAt(page, variants[3]);

    await expect(block.locator('img, picture')).toHaveCount(0);
    await expect(block.locator('.card-heading')).toHaveCount(3);
    await expect(block.locator('p.spectrum-Body')).toHaveCount(3);
    await expect(block.getByRole('link')).toHaveCount(0);
  });

  test('renders dark-gray text-only cards with white text', async ({ page }) => {
    const block = blockAt(page, variants[4]);

    await expect(block).toHaveCSS('background-color', 'rgb(50, 50, 50)');
    await expect(block.locator('img, picture')).toHaveCount(0);
    await expect(block.locator('.card-heading').first())
      .toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(block.locator('p.spectrum-Body').first())
      .toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('decorates wide images without CTA links', async ({ page }) => {
    const block = blockAt(page, variants[5]);

    await expect(block.locator('img')).toHaveCount(3);
    await expect(block.locator('a.card-button')).toHaveCount(0);
    await expect(block.getByRole('link')).toHaveCount(0);
    await expect(block.locator('img').first()).toHaveCSS('height', '200px');
  });

  test('groups Jira Cloud buttons and aligns the start variant', async ({ page }) => {
    const block = blockAt(page, variants[6]);
    const jiraCard = cardsIn(block).filter({
      has: page.getByRole('heading', { name: 'Jira Cloud', exact: true }),
    });
    const buttonGroup = jiraCard.locator('.cards-button-container');

    await expect(jiraCard).toHaveCount(1);
    await expect(jiraCard).toHaveCSS('text-align', 'start');
    await expect(buttonGroup).toHaveCount(1);
    await expect(buttonGroup).toHaveCSS('justify-content', 'start');
    await expect(buttonGroup.getByRole('link', { name: 'Read more', exact: true }))
      .toBeVisible();
    await expect(buttonGroup.getByRole('link', { name: 'Blog', exact: true }))
      .toBeVisible();
    await expect(block.getByRole('link')).toHaveCount(2);
    await expect(buttonGroup.getByRole('link')).toHaveCount(2);
  });

  for (const variant of variants) {
    test(`matches the ${variant.name} visual snapshot`, async ({ page }) => {
      await hideNonComponentContent(page);
      // The fixed header's logo bleeds across the first wrapper's top edge.
      await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
      const block = blockAt(page, variant);

      await waitForCardImages(block, variant.imageCount);
      await page.evaluate(() => document.fonts.ready);
      await expect(block.locator('..')).toHaveScreenshot(variant.snapshot);
    });
  }
});
