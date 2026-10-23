import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/discoverblock/';
const cards = [
  {
    name: 'Developer Guide',
    slots: 'heading, link, text',
    description: 'Start building your first application.',
    href: 'https://example.com/quickstart',
  },
  {
    name: 'API Reference',
    slots: 'link, text',
    description: 'Explore the complete API documentation.',
    href: 'https://example.com/api',
  },
  {
    name: 'Forum',
    slots: 'image, heading, link, text',
    description: 'Ask questions and share knowledge.',
    href: 'https://example.com/forum',
  },
  {
    name: 'Portal',
    slots: 'link, text',
    description: 'Manage your applications.',
    href: 'https://example.com/portal',
  },
  {
    name: 'Contributing',
    slots: 'link, text',
    description: 'Contribute to the project.',
    href: 'https://github.com/example/project',
  },
];

function getCard(page, name) {
  return page.locator('main .discoverblock.block').filter({
    has: page.getByRole('link', { name, exact: true }),
  });
}

function wrapperOf(block) {
  return block.locator('..');
}

async function openDiscoverBlockPage(page) {
  await openDevDocsReferencePage(page, {
    path,
    heading: 'Discover Block',
  });

  // The fixture has five cards. Loaded status proves decoration completed,
  // including the heading relocation that is not visible in authored markup.
  await expect(page.locator('main .discoverblock.block')).toHaveCount(cards.length);
  await expect(page.locator('main .discoverblock.block[data-block-status="loaded"]'))
    .toHaveCount(cards.length);
}

async function expectLoadedImage(block) {
  const image = block.locator(':scope > img.discover-image');

  await expect(image).toHaveCount(1);
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (
    element.complete && element.naturalWidth > 0
  ))).toBe(true);

  return image;
}

async function expectInlineWidth(block, expectedWidth) {
  await expect.poll(() => wrapperOf(block).evaluate((element) => element.style.width))
    .toBe(expectedWidth);
}

async function getScreenshotClip(...locators) {
  await locators[0].scrollIntoViewIfNeeded();
  const boxes = await Promise.all(locators.map((locator) => locator.boundingBox()));

  if (boxes.some((box) => box === null)) {
    throw new Error('Screenshot target must have visible bounds');
  }

  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

test.describe('Discover Block reference', () => {
  test.beforeEach(async ({ page }) => openDiscoverBlockPage(page));

  test('decorates every authored card with its content and destination', async ({ page }) => {
    for (const card of cards) {
      const block = getCard(page, card.name);
      const link = block.getByRole('link', { name: card.name, exact: true });

      await expect(block).toHaveCount(1);
      await expect(block).toHaveAttribute('daa-lh', 'discover');
      await expect(block).toHaveAttribute('data-slots', card.slots);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', card.href);
      await expect(block).toContainText(card.description);
    }
  });

  test('hoists authored headings and preserves their anchor links', async ({ page }) => {
    // The generated anchor is part of the heading's accessible name. Scope to
    // the decorated headings because the page can append related-content titles.
    const main = page.locator('main');
    const getStarted = main.locator('h2.discoverblock-heading');
    const community = main.locator('h3.discoverblock-heading');
    const developerGuide = getCard(page, 'Developer Guide');
    const forum = getCard(page, 'Forum');

    await expect(getStarted).toHaveCount(1);
    await expect(getStarted).toHaveClass(/\bdiscoverblock-heading\b/);
    await expect(getStarted.getByRole('link', { name: 'get-started', exact: true }))
      .toHaveAttribute('href', /#get-started$/);
    await expect(getStarted.locator('xpath=following-sibling::*[1]'))
      .toContainText('Developer Guide');
    await expect(developerGuide.getByRole('heading')).toHaveCount(0);

    await expect(community).toHaveCount(1);
    await expect(community).toHaveClass(/\bdiscoverblock-heading\b/);
    await expect(community).toHaveClass(/\bdiscover-heading-with-image\b/);
    await expect(community.getByRole('link', { name: 'community', exact: true }))
      .toHaveAttribute('href', /#community$/);
    await expect(community.locator('xpath=following-sibling::*[1]'))
      .toContainText('Forum');
    await expect(forum.getByRole('heading')).toHaveCount(0);
  });

  test('applies the image and width layout variants', async ({ page }) => {
    const forum = getCard(page, 'Forum');
    const portal = getCard(page, 'Portal');
    const contributing = getCard(page, 'Contributing');
    const image = await expectLoadedImage(forum);
    const content = forum.locator(':scope > div');

    await expect(forum).toHaveClass(/\bhas-image\b/);
    await expect(image).toHaveAttribute('alt', 'Community');
    await expect(image).toHaveCSS('width', '100px');
    await expect(image).toHaveCSS('flex-shrink', '0');
    await expect(forum).toHaveCSS('display', 'flex');
    await expect(content).toHaveCount(1);

    const [imageBox, contentBox] = await Promise.all([
      image.boundingBox(),
      content.boundingBox(),
    ]);
    if (!imageBox || !contentBox) throw new Error('Forum image and content must have visible bounds');
    expect(imageBox.x + imageBox.width).toBeLessThanOrEqual(contentBox.x);

    // Image cards intentionally override their authored width so the image and
    // text remain together; non-image cards keep the authored grid width.
    await expectInlineWidth(forum, '369.333px');
    await expectInlineWidth(portal, '33%');
    await expectInlineWidth(contributing, '33%');
    await expect(portal).not.toHaveClass(/\bhas-image\b/);
    await expect(contributing).not.toHaveClass(/\bhas-image\b/);
  });

  test('matches Basic visuals', async ({ page }) => {
    const getStarted = page.locator('main h2.discoverblock-heading');
    const developerGuide = getCard(page, 'Developer Guide');
    const apiReference = getCard(page, 'API Reference');

    await expect(getStarted).toHaveClass(/\bdiscoverblock-heading\b/);
    await expect(developerGuide).toHaveAttribute('data-block-status', 'loaded');
    await expect(apiReference).toHaveAttribute('data-block-status', 'loaded');
    await hideNonComponentContent(page);
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('discoverblock-basic.png', {
      clip: await getScreenshotClip(
        getStarted,
        wrapperOf(developerGuide),
        wrapperOf(apiReference),
      ),
    });
  });

  test('matches Grid Layout visuals', async ({ page }) => {
    const gridLayout = page.locator('main').getByRole('heading', {
      level: 3,
      name: 'Grid Layout:',
      exact: true,
    });
    const forum = getCard(page, 'Forum');
    const portal = getCard(page, 'Portal');
    const contributing = getCard(page, 'Contributing');

    await expect(gridLayout).toBeVisible();
    await expect(forum).toHaveClass(/\bhas-image\b/);
    await expectLoadedImage(forum);
    await expectInlineWidth(forum, '369.333px');
    await expectInlineWidth(portal, '33%');
    await expectInlineWidth(contributing, '33%');
    await hideNonComponentContent(page);
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('discoverblock-grid-layout.png', {
      clip: await getScreenshotClip(
        gridLayout,
        wrapperOf(forum),
        wrapperOf(portal),
        wrapperOf(contributing),
      ),
    });
  });
});
