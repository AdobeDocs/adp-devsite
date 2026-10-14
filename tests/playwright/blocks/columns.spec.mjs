import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const imageFixture = {
  path: '/dev-docs-reference/blocks/columns/columns-with-image',
  heading: 'Columns with Image',
  rows: 3,
  snapshot: 'columns-image.png',
};
const videoFixture = {
  path: '/dev-docs-reference/blocks/columns/columns-with-video',
  heading: 'Columns with Video',
  rows: 2,
  snapshot: 'columns-video.png',
};
const reverseFixture = {
  path: '/dev-docs-reference/blocks/columns/columns-with-reverse',
  heading: 'Columns with Image / Video (Reversed)',
  rows: 3,
  snapshot: 'columns-reverse.png',
};
const devBizPath = '/tools/sidekick/blocks/columns';
const featureHeadings = ['Feature One', 'Feature Two', 'Feature Three'];
const imageAlts = ['Feature 1', 'Feature 2', 'Feature 3'];
const stackingBreakpointWidth = 1280;
const wideDesktopViewport = { width: 1281, height: 900 };
const devBizVariants = [
  {
    name: 'default gray',
    index: 0,
    firstHeading: 'Tempus leo eu aenean',
    rowCount: 3,
    imageCount: 3,
    snapshot: 'columns-devbiz-default-gray.png',
  },
  {
    name: 'white background',
    index: 1,
    firstHeading: 'Tempus leo eu aenean',
    className: 'background-color-white',
    rowCount: 3,
    imageCount: 3,
    snapshot: 'columns-devbiz-white-background.png',
  },
  {
    name: 'centered list',
    index: 2,
    firstHeading: 'Lorem ipsum dolor',
    className: 'center',
    rowCount: 1,
    imageCount: 0,
    snapshot: 'columns-devbiz-centered-list.png',
  },
  {
    name: 'full-width background',
    index: 3,
    firstHeading: 'Ad litora torquent per conubia',
    className: 'full-width-background',
    rowCount: 3,
    imageCount: 3,
    hasBackgroundImage: true,
    snapshot: 'columns-devbiz-full-width-background.png',
  },
];

async function hideColumnsScreenshotOverlays(page) {
  await hideNonComponentContent(page);
  // The fixed global header can cross a block wrapper while Playwright scrolls
  // it into view. It is not part of the component contract.
  await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
}

function rowsIn(block) {
  return block.locator(':scope > div');
}

function wrapperOf(block) {
  return block.locator('..');
}

function devBizBlockAt(page, variant) {
  // The authored DevBiz fixture order is part of this positional locator contract.
  return page.locator('.columns.block').nth(variant.index);
}

async function openDevDocsColumnsFixture(page, fixture) {
  await openDevDocsReferencePage(page, fixture);

  const block = page.locator('.columns.block');
  await expect(block).toHaveCount(1);
  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  await expect(block).toHaveClass(/\bisDocs\b/);
  await expect(block).toHaveAttribute('daa-lh', 'columns');

  return block;
}

async function expectTwoColumnRows(block, expectedCount) {
  const rows = rowsIn(block);

  await expect(rows).toHaveCount(expectedCount);
  await expect(rows.first()).toHaveClass(/\bfirst-column-div\b/);
  await expect(rows.last()).toHaveClass(/\blast-column-div\b/);
  for (let index = 0; index < expectedCount; index += 1) {
    const row = rows.nth(index);
    await expect(row.locator(':scope > .first-column')).toHaveCount(1);
    await expect(row.locator(':scope > .second-column')).toHaveCount(1);
  }
}

async function expectDecoratedHeadings(block, headings) {
  const columnHeadings = block.locator('.column-header');

  await expect(columnHeadings).toHaveCount(headings.length);
  await expect(block.locator('.column-header .anchor-link')).toHaveCount(headings.length);
  for (const heading of headings) {
    await expect(block.getByRole('heading', { level: 3, name: heading, exact: true }))
      .toHaveClass(/\bspectrum-Heading--sizeM\b/);
  }
}

async function expectOutlineButtons(block, expectedCount) {
  const buttons = block.getByRole('link', { name: 'Learn more', exact: true });

  await expect(buttons).toHaveCount(expectedCount);
  for (let index = 0; index < expectedCount; index += 1) {
    await expect(buttons.nth(index)).toHaveAttribute('href', /^https:\/\/example\.com\/?$/);
    await expect(buttons.nth(index)).toHaveClass(/\bspectrum-Button--secondary\b/);
    await expect(buttons.nth(index)).toHaveClass(/\bspectrum-Button--outline\b/);
  }
}

async function waitForColumnImages(block, expectedCount) {
  const images = block.locator('.first-column picture > img');

  await expect(images).toHaveCount(expectedCount);
  if (expectedCount === 0) return;

  // Image optimization starts when the block intersects the viewport. Scrolling
  // the stable block avoids retaining a locator to a replaced authored image.
  await block.scrollIntoViewIfNeeded();
  await expect.poll(() => images.evaluateAll((elements, count) => (
    elements.length === count && elements.every((image) => (
      image.complete && image.naturalWidth > 0
    ))
  ), expectedCount)).toBe(true);
}

async function waitForBackgroundImage(wrapper) {
  await expect.poll(() => wrapper.evaluate(async (element) => {
    const backgroundImage = getComputedStyle(element).backgroundImage;
    if (backgroundImage === 'none') return false;

    const url = backgroundImage.slice(4, -1).replace(/^['"]|['"]$/g, '');
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      return image.naturalWidth > 0;
    } catch {
      return false;
    }
  })).toBe(true);
}

async function expectRowDirections(block, directions) {
  const rows = rowsIn(block);

  await expect.poll(() => rows.evaluateAll((elements) => (
    elements.map((element) => getComputedStyle(element).flexDirection)
  ))).toEqual(directions);
}

async function expectDesktopRowDirections(page, block, directions) {
  // The default 1280px viewport is the CSS stacking breakpoint. Use the first
  // wider desktop width so these assertions prove alternation rather than stack.
  await page.setViewportSize(wideDesktopViewport);
  await expectRowDirections(block, directions);
}

async function expectStackedRowDirections(page, block, rowCount) {
  // Assert the configured default width so this test continues to exercise
  // the inclusive 1280px breakpoint without needing a resize.
  expect(page.viewportSize()).toMatchObject({ width: stackingBreakpointWidth });
  await expectRowDirections(block, Array(rowCount).fill('column'));
}

async function isolateDevBizWrapper(page, wrapper) {
  await wrapper.evaluate((element) => element.setAttribute('data-columns-screenshot-target', ''));
  // Fractional wrapper bounds can otherwise include a pixel row from a sibling
  // block, making a snapshot depend on the next fixture's rendering.
  await page.addStyleTag({ content: `
    main .columns-wrapper:not([data-columns-screenshot-target]) {
      visibility: hidden !important;
    }
  ` });
}

async function openDevBizColumnsPage(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  const blocks = page.locator('.columns.block');
  await expect(blocks).toHaveCount(devBizVariants.length);
  await expect(page.locator('.columns.block[data-block-status="loaded"]'))
    .toHaveCount(devBizVariants.length);

  // Assert every index before scenarios use .nth(). The authored order is:
  // default gray, white background, centered list, full-width background.
  for (const variant of devBizVariants) {
    const block = blocks.nth(variant.index);
    await expect(block).toHaveAttribute('daa-lh', 'columns');
    await expect(rowsIn(block), `${variant.name} should have ${variant.rowCount} rows`)
      .toHaveCount(variant.rowCount);
    await expect(block.getByRole('heading', {
      name: variant.firstHeading,
      exact: true,
    }).first(), `${variant.name} should identify its authored content`).toBeVisible();

    if (variant.className) {
      await expect(block).toHaveClass(new RegExp(`(^|\\s)${variant.className}(\\s|$)`));
    }
  }

  await page.evaluate(() => document.fonts.ready);
}

async function prepareDevBizScreenshot(page, variant) {
  const block = devBizBlockAt(page, variant);
  const wrapper = wrapperOf(block);

  if (variant.className) {
    await expect(block).toHaveClass(new RegExp(`(^|\\s)${variant.className}(\\s|$)`));
  } else {
    await expect(block).not.toHaveClass(/\bbackground-color-white\b|\bcenter\b|\bfull-width-background\b/);
  }
  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  await waitForColumnImages(block, variant.imageCount);
  if (variant.hasBackgroundImage) await waitForBackgroundImage(wrapper);
  await page.evaluate(() => document.fonts.ready);
  await isolateDevBizWrapper(page, wrapper);
  await hideColumnsScreenshotOverlays(page);

  return { block, wrapper };
}

test.describe('Columns DevDocs image reference', () => {
  test('decorates image rows, headings, images, and buttons', async ({ page }) => {
    const block = await openDevDocsColumnsFixture(page, imageFixture);

    await expect(block).toHaveAttribute('data-slots', 'image, heading, text, buttons');
    await expect(block).toHaveAttribute('data-repeat', '3');
    await expectTwoColumnRows(block, imageFixture.rows);
    await expectDecoratedHeadings(block, featureHeadings);
    await expectOutlineButtons(block, imageFixture.rows);
    await waitForColumnImages(block, imageFixture.rows);

    const images = block.locator('.first-column picture > img');
    for (let index = 0; index < imageAlts.length; index += 1) {
      await expect(images.nth(index)).toHaveAttribute('alt', imageAlts[index]);
    }
  });

  test('alternates image and text rows on wide desktop', async ({ page }) => {
    const block = await openDevDocsColumnsFixture(page, imageFixture);

    await expectTwoColumnRows(block, imageFixture.rows);
    await expectDesktopRowDirections(page, block, ['row', 'row-reverse', 'row']);
  });

  test('matches the image fixture visual snapshot', async ({ page }) => {
    await page.setViewportSize(wideDesktopViewport);
    const block = await openDevDocsColumnsFixture(page, imageFixture);

    await expect(block).toHaveAttribute('data-slots', 'image, heading, text, buttons');
    await waitForColumnImages(block, imageFixture.rows);
    await page.evaluate(() => document.fonts.ready);
    await hideColumnsScreenshotOverlays(page);
    await expect(wrapperOf(block)).toHaveScreenshot(imageFixture.snapshot);
  });
});

test.describe('Columns DevDocs 1280px stack', () => {
  test('stacks reversed rows at the breakpoint', async ({ page }) => {
    const block = await openDevDocsColumnsFixture(page, reverseFixture);

    await expect(block).toHaveClass(/\bisReversed\b/);
    await expectTwoColumnRows(block, reverseFixture.rows);
    await expectStackedRowDirections(page, block, reverseFixture.rows);
  });

  test('matches the stacked reversed fixture visual snapshot', async ({ page }) => {
    const block = await openDevDocsColumnsFixture(page, reverseFixture);

    await expect(block).toHaveClass(/\bisReversed\b/);
    await expectStackedRowDirections(page, block, reverseFixture.rows);
    await waitForColumnImages(block, reverseFixture.rows);
    await page.evaluate(() => document.fonts.ready);
    await hideColumnsScreenshotOverlays(page);
    await expect(wrapperOf(block)).toHaveScreenshot('columns-reverse-stacked.png');
  });
});

test.describe('Columns DevDocs video reference', () => {
  test('decorates video slots with muted looping videos', async ({ page }) => {
    const block = await openDevDocsColumnsFixture(page, videoFixture);
    const videos = block.locator('.video-container.first-column video');

    await expect(block).toHaveAttribute('data-slots', 'video, heading, text, buttons');
    await expect(block).toHaveAttribute('data-repeat', '2');
    await expectTwoColumnRows(block, videoFixture.rows);
    await expectDecoratedHeadings(block, featureHeadings.slice(0, videoFixture.rows));
    await expectOutlineButtons(block, videoFixture.rows);
    await expect(videos).toHaveCount(videoFixture.rows);
    for (let index = 0; index < videoFixture.rows; index += 1) {
      const video = videos.nth(index);
      await expect(video).toHaveAttribute('src', /example-video\.mp4$/);
      await expect(video).toHaveAttribute('title', 'Video alt description');
      await expect(video).toHaveJSProperty('autoplay', true);
      await expect(video).toHaveJSProperty('muted', true);
      await expect(video).toHaveJSProperty('loop', true);
      await expect(video).toHaveJSProperty('controls', false);
    }
  });

  test('matches the video fixture visual snapshot', async ({ page }) => {
    await page.setViewportSize(wideDesktopViewport);
    const block = await openDevDocsColumnsFixture(page, videoFixture);
    const videos = block.locator('.video-container.first-column video');

    await expect(block).toHaveAttribute('data-slots', 'video, heading, text, buttons');
    await expect(videos).toHaveCount(videoFixture.rows);
    await page.evaluate(() => document.fonts.ready);
    await hideColumnsScreenshotOverlays(page);
    // The MP4's decoded frame is time- and network-dependent. Its behavior is
    // asserted above; mask only the moving frames while snapshotting their layout.
    await expect(wrapperOf(block)).toHaveScreenshot(videoFixture.snapshot, {
      mask: [videos],
    });
  });
});

test.describe('Columns DevDocs reverse reference', () => {
  test('reverses the image and text order on wide desktop', async ({ page }) => {
    const block = await openDevDocsColumnsFixture(page, reverseFixture);

    await expect(block).toHaveAttribute('data-isreversed', 'true');
    await expect(block).toHaveClass(/\bisReversed\b/);
    await expectTwoColumnRows(block, reverseFixture.rows);
    await expectDecoratedHeadings(block, featureHeadings);
    await waitForColumnImages(block, reverseFixture.rows);
    await expectDesktopRowDirections(page, block, ['row-reverse', 'row', 'row-reverse']);
  });

  test('matches the reversed fixture visual snapshot', async ({ page }) => {
    await page.setViewportSize(wideDesktopViewport);
    const block = await openDevDocsColumnsFixture(page, reverseFixture);

    await expect(block).toHaveClass(/\bisReversed\b/);
    await waitForColumnImages(block, reverseFixture.rows);
    await page.evaluate(() => document.fonts.ready);
    await hideColumnsScreenshotOverlays(page);
    await expect(wrapperOf(block)).toHaveScreenshot(reverseFixture.snapshot);
  });
});

test.describe('Columns DevBiz reference', () => {
  // Set the viewport before navigation so every DevBiz baseline captures
  // desktop columns rather than the 1280px stacked breakpoint.
  test.use({ viewport: wideDesktopViewport });
  test.beforeEach(async ({ page }) => openDevBizColumnsPage(page));

  test('decorates the default gray rows, links, and buttons', async ({ page }) => {
    const block = devBizBlockAt(page, devBizVariants[0]);

    await expect(wrapperOf(block)).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await expectTwoColumnRows(block, devBizVariants[0].rowCount);
    await expectDecoratedHeadings(block, [
      'Tempus leo eu aenean',
      'Lorem ipsum dolor sit',
      'Ad litora torquent per conubia',
    ]);
    await expectDesktopRowDirections(page, block, ['row', 'row-reverse', 'row']);
    await waitForColumnImages(block, devBizVariants[0].imageCount);

    const quietLinks = block.locator('a.spectrum-Link.spectrum-Link--quiet:not(.anchor-link)');
    const buttons = block.locator('a.button.spectrum-Button');
    await expect(quietLinks).toHaveCount(3);
    await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toHaveClass(/\bspectrum-Button--fill\b/);
    await expect(buttons.first()).toHaveClass(/\bspectrum-Button--accent\b/);
    await expect(buttons.last()).toHaveClass(/\bspectrum-Button--outline\b/);
    await expect(buttons.last()).toHaveClass(/\bspectrum-Button--secondary\b/);
  });

  test('uses the authored white background variant', async ({ page }) => {
    const block = devBizBlockAt(page, devBizVariants[1]);

    await expect(block).toHaveClass(/\bbackground-color-white\b/);
    await expect(wrapperOf(block)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expectTwoColumnRows(block, devBizVariants[1].rowCount);
  });

  test('decorates the centered listing variant', async ({ page }) => {
    const block = devBizBlockAt(page, devBizVariants[2]);
    const row = rowsIn(block).first();
    const lists = block.locator('ul');

    await expect(block).toHaveClass(/\bcenter\b/);
    await expect(rowsIn(block)).toHaveCount(1);
    await expect(row.locator(':scope > .listing')).toHaveCount(3);
    await expect(lists).toHaveCount(3);
    await expectDecoratedHeadings(block, [
      'Lorem ipsum dolor',
      'Sit amet consectetur',
      'Quisque faucibus ex',
    ]);
    await expect(lists.nth(0).locator('li')).toHaveCount(4);
    await expect(lists.nth(1).locator('li')).toHaveCount(6);
    await expect(lists.nth(2).locator('li')).toHaveCount(5);
    await expectDesktopRowDirections(page, block, ['row']);
  });

  test('uses the authored image as the full-width background', async ({ page }) => {
    const block = devBizBlockAt(page, devBizVariants[3]);
    const wrapper = wrapperOf(block);

    await expect(block).toHaveClass(/\bfull-width-background\b/);
    await expect(block).toHaveClass(/\bfont-white\b/);
    await expectTwoColumnRows(block, devBizVariants[3].rowCount);
    await waitForBackgroundImage(wrapper);
    await expect(wrapper).toHaveCSS('background-repeat', 'no-repeat');
    await expect(wrapper).toHaveCSS('background-size', 'cover');
    await expect(wrapper).toHaveCSS('background-position', '50% 50%');
    await expect(block.locator('.column-header').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(block.locator('p.spectrum-Body').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  for (const variant of devBizVariants) {
    test(`matches the ${variant.name} visual snapshot`, async ({ page }) => {
      const { wrapper } = await prepareDevBizScreenshot(page, variant);

      await expect(wrapper).toHaveScreenshot(variant.snapshot);
    });
  }
});
