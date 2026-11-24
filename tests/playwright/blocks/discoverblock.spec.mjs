import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/discoverblock/';
// discoverblock.js gives image cards a fixed width, (2 * 1280) / 12 + 156
// pixels, so the image and text stay readable. Other cards use their authored
// width but never shrink below the min-width in discoverblock.css; when a row
// has no room, cards wrap instead.
const imageCardWidth = (2 * 1280) / 12 + 156;
const minCardWidth = 280;
// The documented 3-column grid fits from roughly 1680px wide; use a common
// wide desktop width with margin above that point.
const wideDesktopViewport = { width: 1920, height: 900 };
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

async function expectImageCardWidth(block) {
  await expect.poll(async () => (await wrapperOf(block).boundingBox())?.width ?? 0)
    .toBeCloseTo(imageCardWidth, 0);
}

async function getGridWrapperBoxes(page) {
  const boxes = await Promise.all(['Forum', 'Portal', 'Contributing']
    .map((name) => wrapperOf(getCard(page, name)).boundingBox()));
  if (boxes.some((box) => box === null)) throw new Error('Grid cards must have visible bounds');

  return boxes;
}

async function hideDiscoverBlockScreenshotOverlays(page) {
  await hideNonComponentContent(page);
  // The fixed global header can overlap the top of a component container when
  // Locator.screenshot scrolls that container into view.
  await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
}

async function isolateScreenshotContainer(page, container, targets) {
  await container.evaluate((element) => {
    element.setAttribute('data-discoverblock-screenshot-container', '');
  });
  await Promise.all(targets.map((target) => target.evaluate((element) => {
    element.setAttribute('data-discoverblock-screenshot-target', '');
  })));
  await page.addStyleTag({ content: `
    [data-discoverblock-screenshot-container] >
    :not([data-discoverblock-screenshot-target]) {
      display: none !important;
    }
  ` });
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
    await expect(getStarted).toBeVisible();
    await expect(getStarted.getByRole('link', { name: 'get-started', exact: true }))
      .toHaveAttribute('href', /#get-started$/);
    await expect(getStarted.locator('xpath=following-sibling::*[1]'))
      .toContainText('Developer Guide');
    await expect(developerGuide.getByRole('heading')).toHaveCount(0);

    await expect(community).toHaveCount(1);
    await expect(community).toBeVisible();
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

    // Image cards keep their fixed readable width; other cards keep the
    // authored grid width.
    await expectImageCardWidth(forum);
    await expectInlineWidth(portal, '33%');
    await expectInlineWidth(contributing, '33%');
    await expect(portal).not.toHaveClass(/\bhas-image\b/);
    await expect(contributing).not.toHaveClass(/\bhas-image\b/);
  });

  test('wraps the grid instead of shrinking cards when the row is narrow', async ({ page }) => {
    // The default 1280px viewport is too narrow for three grid columns.
    await expectImageCardWidth(getCard(page, 'Forum'));
    const [forumBox, portalBox, contributingBox] = await getGridWrapperBoxes(page);

    expect(portalBox.y).toBeCloseTo(forumBox.y, 1);
    expect(portalBox.width).toBeGreaterThanOrEqual(minCardWidth);
    expect(contributingBox.y).toBeGreaterThan(forumBox.y + forumBox.height - 1);
    expect(contributingBox.width).toBeGreaterThanOrEqual(minCardWidth);
  });

  test('matches Basic visuals', async ({ page }) => {
    const getStarted = page.locator('main h2.discoverblock-heading');
    const developerGuide = getCard(page, 'Developer Guide');
    const apiReference = getCard(page, 'API Reference');
    const container = wrapperOf(developerGuide).locator('..');

    await expect(getStarted).toBeVisible();
    await expect(developerGuide).toHaveAttribute('data-block-status', 'loaded');
    await expect(apiReference).toHaveAttribute('data-block-status', 'loaded');
    await hideDiscoverBlockScreenshotOverlays(page);
    await isolateScreenshotContainer(page, container, [
      getStarted,
      wrapperOf(developerGuide),
      wrapperOf(apiReference),
    ]);
    await page.evaluate(() => document.fonts.ready);

    await expect(container).toHaveScreenshot('discoverblock-basic.png');
  });

});

test.describe('Discover Block reference on wide desktop', () => {
  // Set the viewport before navigation so decoration and layout happen at the
  // width where the documented 3-column grid fits.
  test.use({ viewport: wideDesktopViewport });
  test.beforeEach(async ({ page }) => openDiscoverBlockPage(page));

  test('lays out the documented 3-column grid on one row', async ({ page }) => {
    await expectImageCardWidth(getCard(page, 'Forum'));
    const [forumBox, portalBox, contributingBox] = await getGridWrapperBoxes(page);

    expect(portalBox.y).toBeCloseTo(forumBox.y, 1);
    expect(contributingBox.y).toBeCloseTo(forumBox.y, 1);
    expect(portalBox.x).toBeGreaterThan(forumBox.x);
    expect(contributingBox.x).toBeGreaterThan(portalBox.x);
  });

  test('matches Grid Layout visuals', async ({ page }) => {
    const community = page.locator('main h3.discoverblock-heading');
    const forum = getCard(page, 'Forum');
    const portal = getCard(page, 'Portal');
    const contributing = getCard(page, 'Contributing');
    const container = wrapperOf(forum).locator('..');

    await expect(community).toHaveCount(1);
    await expect(forum).toHaveClass(/\bhas-image\b/);
    await expectLoadedImage(forum);
    await expectImageCardWidth(forum);
    await expectInlineWidth(portal, '33%');
    await expectInlineWidth(contributing, '33%');
    await hideDiscoverBlockScreenshotOverlays(page);
    await isolateScreenshotContainer(page, container, [
      community,
      wrapperOf(forum),
      wrapperOf(portal),
      wrapperOf(contributing),
    ]);
    await page.evaluate(() => document.fonts.ready);

    await expect(container).toHaveScreenshot('discoverblock-grid-layout.png');
  });
});
