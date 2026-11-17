import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const descriptionPrefix = 'This is the sample description for the info card content';
const cardDescription = (number) => `${descriptionPrefix} ${number}. Add details about the card features, benefits, and use cases to help users understand what this product offers.`;
const linkedCardHref = 'https://adobe.com/';
const eventHref = 'https://events.ringcentral.com/events/office-hours-for-adobe-express-developers-march-2026';

const imageFixture = {
  path: '/dev-docs-reference/blocks/infocard/',
  heading: 'InfoCard Block',
  snapshot: 'infocard-default.png',
};
const wideFixture = {
  path: '/dev-docs-reference/blocks/infocard/infocard-with-wide-image',
  heading: 'InfoCard Block with Wide Image',
  snapshot: 'infocard-wide.png',
};
const videoFixture = {
  path: '/dev-docs-reference/blocks/infocard/infocard-with-video',
  heading: 'InfoCard Block with Video',
};
const articleFixture = {
  path: '/dev-docs-reference/blocks/infocard/infocard-with-articles',
  heading: 'InfoCard Block with Articles',
};
const imageCards = [
  { heading: 'Heading 1', description: cardDescription('one'), href: null },
  { heading: 'Heading 2', description: cardDescription('two'), href: linkedCardHref },
];
const videoCards = [
  {
    heading: 'March 18, 2026',
    href: eventHref,
    iframeTitle: 'Alt video',
  },
  {
    heading: 'How to Get Your Adobe Express Add-on Approved: Avoiding the Most Common Rejections',
    href: eventHref,
    iframeTitle: 'Alt Video',
  },
];
const articles = [
  {
    href: 'https://blog.developer.adobe.com/en/publish/2026/05/how-to-get-your-adobe-express-add-on-approved-avoiding-the-most-common-rejections',
    title: 'Mock Add-on Approval Guide',
    description: 'A controlled Open Graph description for the first article card.',
    image: 'https://images.example.test/article-approval.png',
  },
  {
    href: 'https://blog.developer.adobe.com/en/publish/2026/05/help-your-adobe-express-add-on-reach-enterprise-users-with-granular-admin-approvals',
    title: 'Mock Enterprise Approval Guide',
    description: 'A controlled Open Graph description for the second article card.',
    image: 'https://images.example.test/article-enterprise.png',
  },
];

function cardsIn(block) {
  return block.locator(':scope > ul > li');
}

async function openInfoCardFixture(page, fixture) {
  await openDevDocsReferencePage(page, fixture);

  // The generated list is created only after InfoCard decoration has completed.
  const block = page.locator('.infocard.block[data-block-status="loaded"]');
  await expect(block).toHaveCount(1);
  await expect(cardsIn(block)).toHaveCount(2);

  return block;
}

async function expectLoadedImages(block, count) {
  const images = cardsIn(block).locator('img');

  await expect(images).toHaveCount(count);
  // Optimized pictures can start loading when their block becomes visible.
  await block.scrollIntoViewIfNeeded();
  await expect.poll(() => images.evaluateAll((elements, expectedCount) => (
    elements.length === expectedCount && elements.every((image) => (
      image.complete && image.naturalWidth > 0
    ))
  ), count)).toBe(true);

  return images;
}

async function expectImageCards(block) {
  const cards = cardsIn(block);

  await expect(cards).toHaveCount(imageCards.length);
  await expect(block.locator('.card-heading')).toHaveCount(imageCards.length);
  for (let index = 0; index < imageCards.length; index += 1) {
    const expected = imageCards[index];
    const card = cards.nth(index);
    const image = card.locator('img');

    await expect(card.getByRole('heading', {
      level: 3,
      name: expected.heading,
      exact: true,
    })).toHaveClass(/\bcard-heading\b/);
    await expect(card).toContainText(expected.description);
    await expect(image).toHaveAttribute('alt', 'Alt text');

    if (expected.href) {
      await expect(card.locator(':scope > a')).toHaveAttribute('href', expected.href);
    } else {
      await expect(card.locator(':scope > div')).toHaveCount(1);
      await expect(card.locator(':scope > a')).toHaveCount(0);
    }
  }
}

async function prepareScreenshot(page, block, imageCount) {
  await expectLoadedImages(block, imageCount);
  await page.evaluate(() => document.fonts.ready);
  await hideNonComponentContent(page);
  // Locator screenshots scroll the block below the fixed site header, whose
  // overlap is page chrome rather than part of the InfoCard contract.
  await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(1279, 899);
}

async function mockArticleMetadata(page) {
  await Promise.all(articles.map(async (article) => {
    await page.route(article.href, (route) => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <html>
          <head>
            <meta property="og:title" content="${article.title}">
            <meta property="og:image" content="${article.image}">
            <meta property="og:description" content="${article.description}">
          </head>
        </html>`,
    }));
  }));
}

test.describe('InfoCard DevDocs image fixtures', () => {
  test('decorates image cards while making only the linked heading card clickable', async ({ page }) => {
    const block = await openInfoCardFixture(page, imageFixture);

    await expect(block).toHaveAttribute('daa-lh', 'infocard');
    await expect(block).toHaveAttribute('data-slots', 'image, heading , text');
    await expect(block).toHaveAttribute('data-repeat', '2');
    await expectImageCards(block);
    await expectLoadedImages(block, imageCards.length);
  });

  test('matches the default image-card visual', async ({ page }) => {
    const block = await openInfoCardFixture(page, imageFixture);

    await expectImageCards(block);
    await prepareScreenshot(page, block, imageCards.length);
    await expect(block).toHaveScreenshot(imageFixture.snapshot);
  });
});

test.describe('InfoCard DevDocs wide-image fixture', () => {
  test('uses the wide 16:9 image presentation without changing card destinations', async ({ page }) => {
    const block = await openInfoCardFixture(page, wideFixture);
    const images = cardsIn(block).locator('img');

    await expect(block).toHaveClass(/\bwide\b/);
    await expectImageCards(block);
    await expectLoadedImages(block, imageCards.length);
    for (let index = 0; index < imageCards.length; index += 1) {
      await expect(images.nth(index)).toHaveCSS('aspect-ratio', '16 / 9');
    }
  });

  test('matches the wide image-card visual', async ({ page }) => {
    const block = await openInfoCardFixture(page, wideFixture);

    await expect(block).toHaveClass(/\bwide\b/);
    await expectImageCards(block);
    await prepareScreenshot(page, block, imageCards.length);
    await expect(block).toHaveScreenshot(wideFixture.snapshot);
  });
});

test.describe('InfoCard DevDocs video fixture', () => {
  test('decorates video slots as autoplaying muted embeds without player controls', async ({ page }) => {
    const block = await openInfoCardFixture(page, videoFixture);
    const cards = cardsIn(block);
    const embeds = block.locator('.cards-card-image .video-embed');
    const frames = embeds.locator('iframe');

    await expect(block).toHaveAttribute('data-slots', 'video, heading , text');
    await expect(embeds).toHaveCount(videoCards.length);
    await expect(frames).toHaveCount(videoCards.length);
    for (let index = 0; index < videoCards.length; index += 1) {
      const expected = videoCards[index];
      const card = cards.nth(index);
      const frame = frames.nth(index);

      await expect(card.locator(':scope > a')).toHaveAttribute('href', expected.href);
      await expect(card.getByRole('heading', {
        level: 3,
        name: expected.heading,
        exact: true,
      })).toBeVisible();
      await expect(frame).toHaveAttribute('title', expected.iframeTitle);
      await expect(frame).toHaveAttribute('src', /www\.youtube-nocookie\.com\/embed\/E9atPm5djco/);
      await expect(frame).toHaveAttribute('src', /controls=0/);
      await expect(frame).toHaveAttribute('src', /autoplay=1/);
      await expect(frame).toHaveAttribute('src', /mute=1/);
      await expect(frame).toHaveAttribute('src', /loop=1/);
    }
  });
});

test.describe('InfoCard DevDocs articles fixture', () => {
  test('creates one metadata card per article URL using fetched Open Graph data', async ({ page }) => {
    await mockArticleMetadata(page);
    const block = await openInfoCardFixture(page, articleFixture);
    const cards = cardsIn(block);

    await expect(block).toHaveAttribute('data-slots', 'articles');
    await expect(block).toHaveClass(/\bwide\b/);
    await expect(cards).toHaveCount(articles.length);
    for (let index = 0; index < articles.length; index += 1) {
      const expected = articles[index];
      const card = cards.nth(index);

      await expect(card.locator(':scope > a')).toHaveAttribute('href', expected.href);
      await expect(card.locator('.card-heading')).toHaveText(expected.title);
      await expect(card.locator('.cards-card-body > p')).toHaveText(expected.description);
      await expect(card.locator('img')).toHaveAttribute('alt', expected.title);
      await expect(card.locator('img')).toHaveAttribute('src', new RegExp(expected.image));
    }
  });
});
