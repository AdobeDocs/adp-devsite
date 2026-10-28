import { expect, test } from '@playwright/test';
import { hideNonComponentContent } from '../visual-test-utils.mjs';

const path = '/tools/sidekick/blocks/info-card';
const cardHeadings = ['Forums', 'Chat', 'Code', 'Support'];
const navigationHeadings = ['Forums', 'Chat', 'Code', 'Support', 'Forums', 'Chat'];
const videoFrameTitles = [
  'Content from youtube.com',
  'Content from youtu.be',
  'Content from video.tv.adobe.com',
];

function cardsIn(block) {
  return block.locator(':scope > ul > li');
}

function navigationCardsIn(block) {
  return block.locator('.info-card-viewport > ul > li');
}

async function openDevBizInfoCardPage(page) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  await page.evaluate(() => document.fonts.ready);
}

/**
 * Returns the single InfoCard variant under test once it has finished decorating.
 * Readiness is scoped to that variant so unrelated variants authored on the
 * shared DevBiz page cannot fail or delay this test.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} variant Variant class selector, e.g. `.reverse`.
 */
async function loadedInfoCard(page, variant) {
  const block = page.locator(`.info-card.block${variant}`);

  await expect(block).toHaveCount(1);
  await expect(block).toHaveAttribute('data-block-status', 'loaded');

  return block;
}

async function loadedNavigationInfoCard(page) {
  const block = await loadedInfoCard(page, '.navigation');

  // Generated controls prove the carousel initialized, not only the card list.
  await expect(block.locator('.info-card-nav')).toHaveCount(2);

  return block;
}

async function expectLoadedImages(block, count) {
  const images = block.locator('img');

  await expect(images).toHaveCount(count);
  // Optimized images can be replaced as their block enters the viewport. Keep
  // the locator scoped to the stable block rather than retaining image handles.
  await block.scrollIntoViewIfNeeded();
  for (let index = 0; index < count; index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await expect.poll(() => images.evaluateAll((elements, expectedCount) => (
    elements.length === expectedCount && elements.every((image) => (
      image.complete && image.naturalWidth > 0
    ))
  ), count)).toBe(true);

  return images;
}

async function expectVisibleCardIndexes(cards, visibleIndexes) {
  for (let index = 0; index < await cards.count(); index += 1) {
    if (visibleIndexes.includes(index)) {
      await expect(cards.nth(index)).toBeVisible();
    } else {
      await expect(cards.nth(index)).toBeHidden();
    }
  }
}

async function prepareScreenshot(page, block, imageCount) {
  await expectLoadedImages(block, imageCount);
  await page.evaluate(() => document.fonts.ready);
  await hideNonComponentContent(page);
  // A fixed header can overlap a locator after Playwright scrolls it into view;
  // it is not part of any InfoCard visual contract.
  await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(1279, 899);
}

async function expectNavigationImagesLoaded(block) {
  const images = block.locator('.info-card-viewport > ul > li:visible img');

  await expect(images).toHaveCount(3);
  await block.scrollIntoViewIfNeeded();
  await expect.poll(() => images.evaluateAll((elements) => (
    elements.every((image) => image.complete && image.naturalWidth > 0)
  ))).toBe(true);
}

test.describe('InfoCard DevBiz video variants', () => {
  test.beforeEach(async ({ page }) => openDevBizInfoCardPage(page));

  test('generates video embeds with and without player controls', async ({ page }) => {
    const variants = [
      { selector: '.video:not(.controls)', controls: '0' },
      { selector: '.video.controls', controls: '1' },
    ];

    for (const variant of variants) {
      const block = await loadedInfoCard(page, variant.selector);
      const cards = cardsIn(block);
      const frames = block.locator('.cards-card-image .video-embed iframe');

      await expect(block).toHaveAttribute('daa-lh', 'info-card');
      await expect(cards).toHaveCount(3);
      await expect(frames).toHaveCount(3);
      await expect(cards.locator('.card-heading')).toHaveText([
        'Shorts',
        'Youtube',
        'Video TV Adobe Com',
      ]);
      for (let index = 0; index < videoFrameTitles.length; index += 1) {
        const card = cards.nth(index);
        const frame = frames.nth(index);

        await expect(card.locator(':scope > a')).toHaveAttribute(
          'href',
          'https://developer.adobe.com/',
        );
        await expect(frame).toHaveAttribute('title', videoFrameTitles[index]);
        if (index < 2) {
          // YouTube accepts these player options. Adobe TV uses its provider
          // URL without the same query-string controls contract.
          await expect(frame).toHaveAttribute('src', new RegExp(`controls=${variant.controls}`));
          await expect(frame).toHaveAttribute('src', /autoplay=1/);
          await expect(frame).toHaveAttribute('src', /mute=1/);
          await expect(frame).toHaveAttribute('src', /loop=1/);
        } else {
          await expect(frame).toHaveAttribute('src', /video\.tv\.adobe\.com\/v\/3483370$/);
        }
      }
    }
  });
});

test.describe('InfoCard DevBiz navigation variant', () => {
  test.beforeEach(async ({ page }) => openDevBizInfoCardPage(page));

  test('moves the three-card desktop window one card at a time', async ({ page }) => {
    const block = await loadedNavigationInfoCard(page);
    const cards = navigationCardsIn(block);
    const previous = block.getByRole('button', { name: 'Previous', exact: true });
    const next = block.getByRole('button', { name: 'Next', exact: true });

    // These identities guard the authored sequence before positional visibility
    // assertions exercise the carousel's one-card-at-a-time contract.
    await expect(cards).toHaveCount(navigationHeadings.length);
    await expect(cards.locator('.card-heading')).toHaveText(navigationHeadings);
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expectVisibleCardIndexes(cards, [0, 1, 2]);

    await next.click();
    await expectVisibleCardIndexes(cards, [1, 2, 3]);
    await expect(previous).toBeEnabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expectVisibleCardIndexes(cards, [2, 3, 4]);
    await next.click();
    await expectVisibleCardIndexes(cards, [3, 4, 5]);
    await expect(next).toBeDisabled();

    await previous.click();
    await expectVisibleCardIndexes(cards, [2, 3, 4]);
    await expect(previous).toBeEnabled();
    await expect(next).toBeEnabled();
  });

  test('matches the initial and final carousel visuals', async ({ page }) => {
    const block = await loadedNavigationInfoCard(page);
    const cards = navigationCardsIn(block);
    const next = block.getByRole('button', { name: 'Next', exact: true });

    await expect(cards).toHaveCount(navigationHeadings.length);
    await expect(cards.locator('.card-heading')).toHaveText(navigationHeadings);
    await expectVisibleCardIndexes(cards, [0, 1, 2]);
    await expectNavigationImagesLoaded(block);
    await page.evaluate(() => document.fonts.ready);
    await hideNonComponentContent(page);
    await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
    await page.mouse.move(1279, 899);
    await expect(block).toHaveScreenshot('info-card-navigation-initial.png');

    await next.click();
    await next.click();
    await next.click();
    await expectVisibleCardIndexes(cards, [3, 4, 5]);
    await expect(next).toBeDisabled();
    await expectNavigationImagesLoaded(block);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.mouse.move(1279, 899);
    await expect(block).toHaveScreenshot('info-card-navigation-final.png');
  });
});

test.describe('InfoCard DevBiz layout variants', () => {
  test.beforeEach(async ({ page }) => openDevBizInfoCardPage(page));

  test('places reverse-card text above its image while preserving linked cards', async ({ page }) => {
    const block = await loadedInfoCard(page, '.reverse');
    const cards = cardsIn(block);

    await expect(cards).toHaveCount(cardHeadings.length);
    await expect(cards.locator('.card-heading')).toHaveText(cardHeadings);
    await expectLoadedImages(block, cardHeadings.length);
    for (let index = 0; index < cardHeadings.length; index += 1) {
      const card = cards.nth(index);
      const link = card.locator(':scope > a');
      const body = card.locator('.cards-card-body');
      const image = card.locator('.cards-card-image');
      const [bodyBox, imageBox] = await Promise.all([body.boundingBox(), image.boundingBox()]);

      await expect(link).toHaveAttribute('href', 'https://developer.adobe.com/');
      await expect(link).toHaveCSS('flex-direction', 'column-reverse');
      if (!bodyBox || !imageBox) throw new Error('Reverse card media and body must have visible bounds');
      expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(imageBox.y + 1);
    }
  });

  test('matches the reverse-card visual', async ({ page }) => {
    const block = await loadedInfoCard(page, '.reverse');

    await expect(block.locator('.card-heading')).toHaveText(cardHeadings);
    await prepareScreenshot(page, block, cardHeadings.length);
    await expect(block).toHaveScreenshot('info-card-reverse.png');
  });

  test('renders compact cards as a two-column icon grid', async ({ page }) => {
    const block = await loadedInfoCard(page, '.compact');
    const cards = cardsIn(block);
    const images = cards.locator('img');
    const first = cards.nth(0);
    const second = cards.nth(1);
    const third = cards.nth(2);

    await expect(cards).toHaveCount(6);
    await expect(cards.locator(':scope > a')).toHaveCount(6);
    await expect(block.locator(':scope > ul')).toHaveCSS('display', 'grid');
    for (let index = 0; index < 6; index += 1) {
      const card = cards.nth(index);

      await expect(images.nth(index)).toHaveCSS('width', '32px');
      await expect(images.nth(index)).toHaveCSS('height', '32px');
      await expect(card.locator('.card-heading')).toHaveCSS('display', 'inline');
      await expect(card.locator('.cards-card-body > p')).toHaveCSS('display', 'inline');
    }

    const [firstBox, secondBox, thirdBox] = await Promise.all([
      first.boundingBox(),
      second.boundingBox(),
      third.boundingBox(),
    ]);
    if (!firstBox || !secondBox || !thirdBox) throw new Error('Compact cards must have visible bounds');
    expect(secondBox.y).toBeCloseTo(firstBox.y, 1);
    expect(thirdBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 1);
  });

  test('matches the compact-card visual', async ({ page }) => {
    const block = await loadedInfoCard(page, '.compact');

    await expect(cardsIn(block)).toHaveCount(6);
    await prepareScreenshot(page, block, 6);
    await expect(block).toHaveScreenshot('info-card-compact.png');
  });

  test('constrains narrow cards and their images to the narrow width', async ({ page }) => {
    const block = await loadedInfoCard(page, '.narrow');
    const cards = cardsIn(block);
    const images = cards.locator('img');

    await expect(cards).toHaveCount(3);
    await expect(cards.locator('.card-heading')).toHaveText(cardHeadings.slice(0, 3));
    for (let index = 0; index < 3; index += 1) {
      const card = cards.nth(index);

      await expect(card).toHaveCSS('max-width', '222px');
      await expect(images.nth(index)).toHaveCSS('width', '222px');
      await expect(images.nth(index)).toHaveCSS('aspect-ratio', '4 / 3');
    }
  });

  test('matches the narrow-card visual', async ({ page }) => {
    const block = await loadedInfoCard(page, '.narrow');

    await expect(cardsIn(block)).toHaveCount(3);
    await prepareScreenshot(page, block, 3);
    await expect(block).toHaveScreenshot('info-card-narrow.png');
  });
});
