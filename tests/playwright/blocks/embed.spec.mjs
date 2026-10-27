import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const devDocsPath = '/dev-docs-reference/blocks/embed/';
const devBizPath = '/tools/sidekick/blocks/embed';
const youtubeVideoId = '4haZJxpf9Bo';
const devDocsExamples = [
  { heading: 'Standard YouTube video' },
  { heading: 'Short-form video' },
  { heading: 'YouTube Shorts URL' },
  { heading: 'Hidden player controls' },
];
// DevBiz has no headings, so this table guards its authored order with the
// adjacent library metadata before a test selects a block by index.
const devBizExamples = [
  { name: 'Embed with YouTube video', index: 0 },
  { name: 'Embed with YouTube short', index: 1 },
  { name: 'Embed with attributes', index: 2, className: /\bautoplay\b.*\bloop\b/ },
];

function wrapperOf(block) {
  return block.locator('..');
}

function devDocsEmbedAt(page, index) {
  // The documented examples are authored in the same order as devDocsExamples.
  return page.locator('main .embed.block').nth(index);
}

function devBizEmbedAt(page, index) {
  return page.locator('main .embed.block').nth(index);
}

function libraryMetadataFor(block) {
  return wrapperOf(block).locator('xpath=following-sibling::*[1]');
}

async function stubThirdPartyEmbeds(page) {
  // An iframe's generated URL is the Embed block contract. Its provider-owned
  // document is neither stable nor needed to verify that contract, and routing
  // it avoids provider rate limits in parallel CI runs.
  await page.route(
    /^https?:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com|tiktok\.com)\//,
    (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Stubbed remote embed</title>',
    }),
  );
}

async function openDevDocsEmbedPage(page) {
  await stubThirdPartyEmbeds(page);
  await openDevDocsReferencePage(page, {
    path: devDocsPath,
    heading: 'Embed Block',
  });

  const blocks = page.locator('main .embed.block');
  await expect(blocks).toHaveCount(devDocsExamples.length);
  await expect(page.locator('main .embed.block[data-block-status="loaded"]'))
    .toHaveCount(devDocsExamples.length);
  for (let index = 0; index < devDocsExamples.length; index += 1) {
    await expect(page.getByRole('heading', {
      level: 4,
      name: devDocsExamples[index].heading,
      exact: true,
    })).toHaveCount(1);
    await expect(devDocsEmbedAt(page, index)).toHaveAttribute('daa-lh', 'embed');
  }
}

async function openDevBizEmbedPage(page) {
  await stubThirdPartyEmbeds(page);

  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  const blocks = page.locator('main .embed.block');
  await expect(blocks).toHaveCount(devBizExamples.length);
  await expect(page.locator('main .embed.block[data-block-status="loaded"]'))
    .toHaveCount(devBizExamples.length);
  for (const example of devBizExamples) {
    const block = devBizEmbedAt(page, example.index);
    await expect(block).toHaveAttribute('daa-lh', 'embed');
    await expect(libraryMetadataFor(block)).toContainText(example.name);
    if (example.className) await expect(block).toHaveClass(example.className);
  }
  await page.evaluate(() => document.fonts.ready);
}

async function loadEmbed(block) {
  await block.scrollIntoViewIfNeeded();
  await expect(block).toHaveClass(/\bembed-is-loaded\b/);

  const iframe = block.locator('iframe');
  await expect(iframe).toHaveCount(1);
  return iframe;
}

async function expectEmbedUrl(iframe, {
  origin,
  pathname,
  params,
  hasDataSrc = false,
}) {
  const source = await iframe.getAttribute('src');
  if (!source) throw new Error('Embed iframe must have a source URL');

  const url = new URL(source);
  expect(url.origin).toBe(origin);
  expect(url.pathname).toBe(pathname);
  expect(Object.fromEntries(url.searchParams)).toEqual(params);

  if (hasDataSrc) {
    await expect(iframe).toHaveAttribute('data-src', source);
  } else {
    await expect(iframe).not.toHaveAttribute('data-src');
  }
}

async function prepareEmbedScreenshot(page) {
  await hideNonComponentContent(page);
  // A fixed global header can overlap a block wrapper while Playwright scrolls
  // it into view. It is not part of the Embed block's visual contract.
  await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
}

// Every case begins with a fresh page to prove lazy decoration. Keep the
// reference-page requests ordered so an externally hosted fixture is not
// needlessly throttled; the tests themselves remain independent.
test.describe.configure({ mode: 'default' });

test.describe('Embed DevDocs reference', () => {
  test.beforeEach(async ({ page }) => openDevDocsEmbedPage(page));

  test('loads the standard YouTube player when it enters the viewport', async ({ page }) => {
    const standard = devDocsEmbedAt(page, 0);

    // The examples are below the initial viewport, so an iframe here would
    // prove the block eagerly contacted a remote provider instead of waiting
    // for the observed block to intersect.
    await expect(standard).not.toHaveClass(/\bembed-is-loaded\b/);
    await expect(standard.locator('iframe')).toHaveCount(0);

    const iframe = await loadEmbed(standard);
    await expect(standard).toHaveClass(/\bembed-youtube\b/);
    await expect(standard).toHaveClass(/\bbackground-color-white\b/);
    await expectEmbedUrl(iframe, {
      origin: 'https://www.youtube-nocookie.com',
      pathname: `/embed/${youtubeVideoId}`,
      params: { loop: '0', controls: '1', autoplay: '0' },
      hasDataSrc: true,
    });
    await expect(iframe).toHaveAttribute('title', 'Content from www.youtube.com');
    await expect(iframe).toHaveAttribute('loading', 'lazy');
  });

  test('uses portrait players for explicit and URL-detected YouTube Shorts', async ({ page }) => {
    const explicitShort = devDocsEmbedAt(page, 1);
    const detectedShort = devDocsEmbedAt(page, 2);

    await expect(explicitShort).toHaveAttribute('data-short', 'true');
    await expect(detectedShort).not.toHaveAttribute('data-short');

    const explicitIframe = await loadEmbed(explicitShort);
    const detectedIframe = await loadEmbed(detectedShort);
    for (const block of [explicitShort, detectedShort]) {
      const portraitPlayer = block.locator(':scope > .ytShort');

      await expect(block).toHaveClass(/\bembed-youtube\b/);
      await expect(portraitPlayer).toHaveCount(1);
      await expect(portraitPlayer).toHaveCSS('width', '315px');
      await expect(portraitPlayer).toHaveCSS('height', '560px');
    }

    await expectEmbedUrl(explicitIframe, {
      origin: 'https://www.youtube.com',
      pathname: '/embed/76hGc6mlSSA',
      params: {
        rel: '0', modestbranding: '1', loop: '0', controls: '1', autoplay: '0',
      },
    });
    await expect(explicitIframe).toHaveAttribute('title', 'Content from www.youtube.com');
    await expectEmbedUrl(detectedIframe, {
      origin: 'https://www.youtube.com',
      pathname: '/embed/BwjjMllBahU',
      params: {
        rel: '0', modestbranding: '1', loop: '0', controls: '1', autoplay: '0',
      },
    });
    await expect(detectedIframe).toHaveAttribute('title', 'Content from youtube.com');
  });

  test('hides controls by forcing muted autoplay', async ({ page }) => {
    const noControls = devDocsEmbedAt(page, 3);
    const iframe = await loadEmbed(noControls);

    await expect(noControls).toHaveClass(/\bembed-youtube\b/);
    await expectEmbedUrl(iframe, {
      origin: 'https://www.youtube-nocookie.com',
      pathname: `/embed/${youtubeVideoId}`,
      params: { loop: '0', controls: '0', autoplay: '1', mute: '1' },
      hasDataSrc: true,
    });
    await expect(iframe).toHaveAttribute('title', 'Content from www.youtube.com');
  });

  test('matches the masked standard landscape visual', async ({ page }) => {
    const standard = devDocsEmbedAt(page, 0);
    const iframe = await loadEmbed(standard);
    const wrapper = wrapperOf(standard);

    await expect(standard).toHaveClass(/\bbackground-color-white\b/);
    await expect(wrapper).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await prepareEmbedScreenshot(page);
    // Provider-owned frame content changes independently of this component.
    await expect(wrapper).toHaveScreenshot('embed-standard-landscape.png', {
      mask: [iframe],
    });
  });

  test('matches the masked short portrait visual', async ({ page }) => {
    const explicitShort = devDocsEmbedAt(page, 1);
    const iframe = await loadEmbed(explicitShort);
    const wrapper = wrapperOf(explicitShort);

    await expect(explicitShort.locator(':scope > .ytShort')).toHaveCSS('height', '560px');
    await expect(wrapper).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await prepareEmbedScreenshot(page);
    await expect(wrapper).toHaveScreenshot('embed-short-portrait.png', {
      mask: [iframe],
    });
  });
});

test.describe('Embed DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openDevBizEmbedPage(page));

  test('renders the authored TikTok video as a portrait player', async ({ page }) => {
    const tiktok = devBizEmbedAt(page, 1);
    const iframe = await loadEmbed(tiktok);
    const player = tiktok.locator(':scope > div');

    await expect(tiktok).toHaveClass(/\bembed-tiktok\b/);
    await expect(player).toHaveCSS('width', '325px');
    await expect(player).toHaveCSS('height', '736px');
    await expectEmbedUrl(iframe, {
      origin: 'https://www.tiktok.com',
      pathname: '/embed/7351077325024398634',
      params: { autoplay: '0' },
    });
    await expect(iframe).toHaveAttribute('title', 'Content from www.tiktok.com');
  });

  test('combines loop and autoplay with the required YouTube playlist', async ({ page }) => {
    const configuredVideo = devBizEmbedAt(page, 2);
    const iframe = await loadEmbed(configuredVideo);

    await expect(configuredVideo).toHaveClass(/\bembed-youtube\b/);
    await expect(configuredVideo).toHaveClass(/\bautoplay\b/);
    await expect(configuredVideo).toHaveClass(/\bloop\b/);
    await expectEmbedUrl(iframe, {
      origin: 'https://www.youtube-nocookie.com',
      pathname: `/embed/${youtubeVideoId}`,
      params: {
        loop: '1', controls: '1', autoplay: '1', mute: '1', playlist: youtubeVideoId,
      },
      hasDataSrc: true,
    });
    await expect(iframe).toHaveAttribute('title', 'Content from www.youtube.com');
  });

  test('matches the masked TikTok portrait visual', async ({ page }) => {
    const tiktok = devBizEmbedAt(page, 1);
    const iframe = await loadEmbed(tiktok);
    const wrapper = wrapperOf(tiktok);

    await expect(tiktok).toHaveClass(/\bembed-tiktok\b/);
    await expect(wrapper).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await prepareEmbedScreenshot(page);
    await expect(wrapper).toHaveScreenshot('embed-tiktok-portrait.png', {
      mask: [iframe],
    });
  });
});
