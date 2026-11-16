import { expect, test } from '@playwright/test';
import { hideNonComponentContent } from '../visual-test-utils.mjs';

const basePath = '/dev-docs-reference/blocks/superhero/';
const headingText = 'Page Heading';
const descriptionText = 'This is a sample description text with an inline link for the superhero block.';

const white = 'rgb(255, 255, 255)';
const navy = 'rgb(15, 55, 95)';
const defaultBlue = 'rgb(29, 125, 238)';
const lightBlue = 'rgb(197, 219, 255)';
// Half Width documents black as its default text color; with no text-color
// modifier the Spectrum lightest theme renders these near-black grays.
const halfWidthDefaultHeading = 'rgb(44, 44, 44)';
const halfWidthDefaultBody = 'rgb(75, 75, 75)';

const heroImage = 'media_1bf0383cbc8885070e9985f8366fc5c8e21ec6dbd';
const sideImage = 'media_162d64570d6325e529397b877dcd8ca32b59bbca7';
const gradientImage = 'media_1ba69a693e6183406c58d95e3f41ff3ca9c0cb22d';

const twoButtons = [
  { name: 'Explore our APIs', href: 'https://example.com/api' },
  { name: 'Get Started', href: 'https://example.com/getting-started' },
];
const getStarted = [{ name: 'Get Started', href: 'https://example.com/getting-started' }];
const getStartedAndExamples = [
  { name: 'Get Started', href: 'https://example.com/getting-started' },
  { name: 'View Examples', href: 'https://example.com/examples' },
];

// Each reference page authors exactly one Superhero example; its slots,
// attributes, and button order are the fixture contract below.
const defaultExamples = [
  {
    name: 'renders the block landing page example with defaults',
    path: '',
    slug: 'landing',
    textColor: white,
    background: defaultBlue,
  },
  {
    name: 'defaults to white text on blue without a variant',
    path: 'default/',
    slug: 'default',
    textColor: white,
    background: defaultBlue,
  },
  {
    name: 'renders an icon above the heading',
    path: 'default/with-icon',
    slug: 'default-icon',
    textColor: white,
    background: defaultBlue,
    icon: true,
  },
  {
    name: 'applies authored text and background colors',
    path: 'default/with-text-and-background-color',
    slug: 'default-colors',
    textColorClass: 'navy',
    textColor: navy,
    background: lightBlue,
    buttons: twoButtons,
  },
  {
    name: 'layers the background image over the authored color',
    path: 'default/with-background-image',
    slug: 'default-image',
    textColor: white,
    background: 'rgb(22, 49, 42)',
    backgroundImage: heroImage,
    buttons: getStarted,
  },
];

const centeredExamples = [
  {
    name: 'renders a background image with buttons over a gradient',
    path: 'centered/',
    slug: 'centered',
    textColor: white,
    background: defaultBlue,
    image: { alt: 'Hero image', src: heroImage },
    overGradient: true,
    buttons: twoButtons,
  },
  {
    name: 'renders an icon above the heading',
    path: 'centered/with-icon',
    slug: 'centered-icon',
    textColor: white,
    background: defaultBlue,
    image: { alt: 'Hero image', src: heroImage },
    icon: true,
    buttons: twoButtons,
  },
  {
    name: 'applies authored text and background colors',
    path: 'centered/with-text-and-background-color',
    slug: 'centered-colors',
    textColorClass: 'navy',
    textColor: navy,
    background: lightBlue,
    buttons: twoButtons,
  },
].map((example) => ({ ...example, variantClass: 'centered', headingLevel: 2 }));

const centeredXlExamples = [
  {
    name: 'renders a background image with buttons over a gradient',
    path: 'centeredxl/',
    slug: 'centeredxl',
    textColor: white,
    background: 'rgb(51, 51, 51)',
    image: { alt: 'Hero banner', src: heroImage },
    overGradient: true,
    buttons: twoButtons,
  },
  {
    name: 'renders an icon above the heading',
    path: 'centeredxl/with-icon',
    slug: 'centeredxl-icon',
    textColor: white,
    background: 'rgb(51, 51, 51)',
    image: { alt: 'Hero banner', src: heroImage },
    icon: true,
    buttons: twoButtons,
  },
  {
    name: 'applies authored text and background colors',
    path: 'centeredxl/with-text-and-background-color',
    slug: 'centeredxl-colors',
    textColorClass: 'navy',
    textColor: navy,
    background: lightBlue,
    buttons: twoButtons,
  },
].map((example) => ({ ...example, variantClass: 'centered-xl', headingLevel: 1 }));

// The Half Width index page documents the variant without an example block;
// its subpages cover the variant.
const halfWidthExamples = [
  {
    name: 'renders an icon with side media on a white background',
    path: 'halfwidth/with-icon',
    slug: 'halfwidth-icon',
    textColor: halfWidthDefaultHeading,
    descriptionColor: halfWidthDefaultBody,
    background: white,
    image: { alt: 'Hero image', src: sideImage },
    icon: true,
    buttons: getStarted,
  },
  {
    name: 'applies authored text and background colors',
    path: 'halfwidth/with-text-and-background-color',
    slug: 'halfwidth-colors',
    textColorClass: 'navy',
    textColor: navy,
    background: lightBlue,
    image: { alt: 'Hero image', src: sideImage },
    buttons: getStartedAndExamples,
  },
  {
    name: 'renders a full-width background image behind side media',
    path: 'halfwidth/with-background-image',
    slug: 'halfwidth-image',
    textColorClass: 'white',
    textColor: white,
    background: white,
    backgroundImage: gradientImage,
    image: { alt: 'Platform illustration', src: sideImage },
    overGradient: true,
    buttons: getStartedAndExamples,
  },
  {
    name: 'renders a full-width background image behind a video',
    path: 'halfwidth/with-background-image-and-video',
    slug: 'halfwidth-video',
    textColorClass: 'white',
    textColor: white,
    background: white,
    backgroundImage: gradientImage,
    video: true,
    overGradient: true,
    buttons: getStartedAndExamples,
  },
].map((example) => ({ ...example, variantClass: 'half-width', headingLevel: 1 }));

const defaultVariantExamples = defaultExamples.map((example) => ({
  ...example,
  variantClass: 'default',
  headingLevel: 1,
}));

const allExamples = [
  ...defaultVariantExamples,
  ...centeredExamples,
  ...centeredXlExamples,
  ...halfWidthExamples,
];

const mobileViewport = { width: 390, height: 844 };
const tabletViewport = { width: 900, height: 1000 };

function hasClass(name) {
  return new RegExp(`(^|\\s)${name}(\\s|$)`);
}

function getSuperhero(page) {
  return page.locator('main .superhero.block');
}

function getWrapper(page) {
  return page.locator('main .superhero-wrapper');
}

/**
 * Opens a Superhero reference page and waits for the block to finish decorating.
 *
 * openDevDocsReferencePage requires a level-1 page heading, but the Centered
 * fixtures author the hero heading as an h2 and centered/with-icon has no h1.
 */
async function openSuperheroPage(page, path) {
  const response = await page.goto(`${basePath}${path}`, { waitUntil: 'domcontentloaded' });
  expect(response, 'the reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `reference page returned ${response.status()}`).toBeTruthy();

  const block = getSuperhero(page);
  await expect(block).toHaveCount(1);
  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  await page.evaluate(() => document.fonts.ready);
  return block;
}

async function expectImageLoaded(image) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0), {
    message: 'image should finish loading',
  }).toBe(true);
}

async function expectCssImageLoaded(locator) {
  const url = await locator.evaluate((element) => {
    const match = getComputedStyle(element).backgroundImage.match(/url\("?(.*?)"?\)/);
    return match?.[1];
  });
  expect(url, 'a CSS background image should be set').toBeTruthy();
  const loaded = await locator.evaluate((_, src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  }), url);
  expect(loaded, `${url} should load`).toBe(true);
}

async function expectCoreRendering(block, example) {
  await expect(block).toBeVisible();
  await expect(block).toHaveAttribute('daa-lh', 'superhero');
  await expect(block).toHaveClass(hasClass(example.variantClass));
  if (example.textColorClass) {
    await expect(block).toHaveClass(hasClass(`text-color-${example.textColorClass}`));
  }

  const heading = block.getByRole('heading', { level: example.headingLevel, name: headingText });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveClass(hasClass('spectrum-Heading--sizeXXL'));
  await expect(heading).toHaveCSS('color', example.textColor);

  const description = block.getByText(descriptionText, { exact: true });
  await expect(description).toBeVisible();
  await expect(description).toHaveCSS('color', example.descriptionColor ?? example.textColor);
  await expect(description.getByRole('link', { name: 'inline link', exact: true }))
    .toHaveAttribute('href', 'https://example.com');

  const icon = block.locator('span.icon img');
  if (example.icon) {
    await expect(icon).toHaveCount(1);
    await expect(icon).toBeVisible();
    await expectImageLoaded(icon);
    // Icon placeholder text is cleared and its wrapping paragraph is unwrapped.
    await expect(block.locator('span.icon')).toHaveText('');
    await expect(block.locator('p > span.icon')).toHaveCount(0);
  } else {
    await expect(icon).toHaveCount(0);
  }

  if (example.overGradient) {
    await expect(block).toHaveClass(hasClass('over-gradient'));
  } else {
    await expect(block).not.toHaveClass(hasClass('over-gradient'));
  }

  if (!example.buttons) {
    await expect(block.locator('a.spectrum-Button')).toHaveCount(0);
  }
}

async function expectButtons(block, buttons) {
  const links = block.locator('a.spectrum-Button');
  await expect(links).toHaveText(buttons.map(({ name }) => name));
  for (const [index, { name, href }] of buttons.entries()) {
    const link = block.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
    // The first authored button is the primary call to action.
    if (index === 0) {
      await expect(link).toHaveClass(hasClass('spectrum-Button--accent'));
      await expect(link).toHaveClass(hasClass('spectrum-Button--fill'));
    } else {
      await expect(link).toHaveClass(hasClass('spectrum-Button--secondary'));
      await expect(link).toHaveClass(hasClass('spectrum-Button--outline'));
    }
  }
}

function relativeLuminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(value) {
  return value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
}

async function textStyle(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.color,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: Number.parseInt(style.fontWeight, 10),
    };
  });
}

// WCAG large text is at least 24px, or 18.66px when bold.
function requiredContrast({ fontSize, fontWeight }) {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
}

async function expectButtonContainer(block, example) {
  const container = example.variantClass === 'default'
    ? block.locator('.all-button-container')
    : block.locator('.superhero-button-container');
  await expect(container).toHaveCount(1);
  await expect(container.locator('a.spectrum-Button')).toHaveCount(example.buttons.length);
}

async function expectAccessibleContent(page, block, example) {
  await expect(block.getByRole('heading')).toHaveCount(1);
  await expect(block.getByRole('heading', { level: example.headingLevel, name: headingText }))
    .toBeVisible();

  // Authored content images keep their alt text.
  if (example.image) {
    await expect(block.getByRole('img', { name: example.image.alt })).toHaveCount(1);
  }

  // Icons are decorative and hidden from assistive technology.
  if (example.icon) {
    await expect(block.locator('span.icon img')).toHaveAttribute('alt', '');
    await expect(block.locator('span.icon').getByRole('img')).toHaveCount(0);
  }

  // Every link has a name, and keyboard focus reaches the buttons in order.
  const inlineLink = block.getByRole('link', { name: 'inline link', exact: true });
  await inlineLink.focus();
  await expect(inlineLink).toBeFocused();
  for (const { name } of example.buttons ?? []) {
    await page.keyboard.press('Tab');
    await expect(block.getByRole('link', { name, exact: true })).toBeFocused();
  }
}

async function expectDefaultLayout(block, example, undefinedRequests) {
  await expect(block).toHaveCSS('background-color', example.background);
  // Decoration collapses the authored slots into a single content column.
  await expect(block.locator(':scope > div')).toHaveCount(1);
  await expect(block.locator('img:not(span.icon img)')).toHaveCount(0);

  if (example.backgroundImage) {
    // The image slot becomes a CSS background layer over the authored color.
    await expect(block).toHaveCSS('background-image', new RegExp(example.backgroundImage));
    await expectCssImageLoaded(block);
  } else {
    // Regression: an unconditional url(${url}) layer requested "<page>/undefined".
    await expect(block).toHaveCSS('background-image', 'none');
    expect(undefinedRequests).toEqual([]);
  }
}

async function expectCenteredLayout(block, example) {
  await expect(block).toHaveClass(hasClass('spectrum--dark'));
  await expect(block).toHaveCSS('background-color', example.background);

  const content = block.locator('.superhero-content');
  await expect(content).toHaveCount(1);
  await expect(content.getByRole('heading', { name: headingText })).toBeVisible();

  const image = block.locator('.background-image-container img');
  if (example.image) {
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('src', new RegExp(example.image.src));
    await expectImageLoaded(image);
  } else {
    await expect(block.locator('img:not(span.icon img)')).toHaveCount(0);
  }
}

async function expectHalfWidthLayout(page, block, example) {
  await expect(block).toHaveClass(hasClass('spectrum--lightest'));
  await expect(page.locator('main .superhero-wrapper > .superhero-wrapper-child > .superhero.block'))
    .toHaveCount(1);
  // Half Width paints its background color on the wrapper, not the block.
  await expect(getWrapper(page)).toHaveCSS('background-color', example.background);

  const columns = block.locator(':scope > div');
  await expect(columns).toHaveCount(2);
  await expect(columns.first().getByRole('heading', { name: headingText })).toBeVisible();

  if (example.image) {
    const image = columns.last().locator('img');
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('src', new RegExp(example.image.src));
    await expectImageLoaded(image);
  }

  if (example.backgroundImage) {
    // fullWidthBackground moves onto the wrapper and its placeholder is removed.
    await expect(block).toHaveClass(hasClass('full-width-background'));
    await expect(getWrapper(page)).toHaveCSS('background-image', new RegExp(example.backgroundImage));
    await expectCssImageLoaded(getWrapper(page));
    await expect(block.locator(`img[src*="${example.backgroundImage}"]`)).toHaveCount(0);
  } else {
    await expect(block).not.toHaveClass(hasClass('full-width-background'));
  }
}

async function expectVideoPlayer(block) {
  await expect(block).toHaveClass(hasClass('video'));

  const container = block.locator(':scope > .superhero-video-container');
  await expect(container).toHaveCount(1);
  await expect(block.getByRole('link', { name: 'video_url' })).toHaveCount(0);

  const video = container.locator('video');
  await expect(video).toHaveCount(1);
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /example-video\.mp4$/);
  // The fixture authors controls, autoplay, and loop together. Controls also
  // let users pause autoplaying, looping media (WCAG 2.2.2).
  expect(await video.evaluate((v) => ({
    controls: v.controls,
    autoplay: v.autoplay,
    muted: v.muted,
    loop: v.loop,
    playsInline: v.playsInline,
  }))).toEqual({
    controls: true,
    autoplay: true,
    muted: true,
    loop: true,
    playsInline: true,
  });
  // The authored link text becomes the accessible name; the fixture authors "video_url".
  await expect(video).toHaveAttribute('aria-label', 'video_url');
  await expect(video).toHaveAttribute('title', 'video_url');
}

async function expectNoHorizontalOverflow(page, block) {
  // Only the hero is checked: the page's Syntax code sample overflows on its own.
  const { width } = page.viewportSize();
  const wrapperBox = await getWrapper(page).boundingBox();
  expect(wrapperBox.x).toBeGreaterThanOrEqual(0);
  expect(wrapperBox.x + wrapperBox.width).toBeLessThanOrEqual(width);
  expect(await block.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const link of await block.getByRole('link').all()) {
    const box = await link.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
}

/**
 * Runs the checks every example page shares, then the variant-specific layout.
 */
function describeExamples(title, examples, expectLayout) {
  test.describe(title, () => {
    examples.forEach((example) => {
      test(`${example.slug} ${example.name}`, async ({ page }) => {
        const undefinedRequests = [];
        page.on('request', (request) => {
          if (/\/undefined(\?|$)/.test(request.url())) undefinedRequests.push(request.url());
        });

        const block = await openSuperheroPage(page, example.path);

        await test.step('renders heading, description, icon, and colors', () => (
          expectCoreRendering(block, example)
        ));
        await test.step('applies the variant layout', () => (
          expectLayout({ page, block, example, undefinedRequests })
        ));
        if (example.buttons) {
          await test.step('renders buttons in authored order', async () => {
            await expectButtons(block, example.buttons);
            await expectButtonContainer(block, example);
          });
        }
        if (example.video) {
          await test.step('replaces the video link with a configured player', () => (
            expectVideoPlayer(block)
          ));
        }
        await test.step('exposes accessible content', () => (
          expectAccessibleContent(page, block, example)
        ));
      });
    });
  });
}

test.describe('Superhero reference', () => {
  describeExamples('Default variant', defaultVariantExamples, ({ block, example, undefinedRequests }) => (
    expectDefaultLayout(block, example, undefinedRequests)
  ));

  describeExamples('Centered variant', centeredExamples, ({ block, example }) => (
    expectCenteredLayout(block, example)
  ));

  describeExamples('Centered XL variant', centeredXlExamples, async ({ block, example }) => {
    await expect(block).toHaveAttribute('data-variant', 'centered-xl');
    await expectCenteredLayout(block, example);
  });

  describeExamples('Half Width variant', halfWidthExamples, ({ page, block, example }) => (
    expectHalfWidthLayout(page, block, example)
  ));

  test.describe('Visuals', () => {
    allExamples.forEach((example) => {
      test(`matches the ${example.slug} visual`, async ({ page }) => {
        const block = await openSuperheroPage(page, example.path);
        await expect(block).toHaveClass(hasClass(example.variantClass));
        await expect(block.getByRole('heading', { name: headingText })).toBeVisible();

        for (const image of await block.locator('img').all()) {
          await expectImageLoaded(image);
        }
        if (example.variantClass === 'default' && example.backgroundImage) {
          await expectCssImageLoaded(block);
        }
        if (example.variantClass === 'half-width' && example.backgroundImage) {
          await expectCssImageLoaded(getWrapper(page));
        }

        await hideNonComponentContent(page);
        // The fixed global header can cross the hero while it scrolls into view.
        await page.addStyleTag({ content: 'body > header { visibility: hidden !important; }' });
        await page.mouse.move(0, page.viewportSize().height - 1);
        await page.evaluate(() => document.fonts.ready);

        await expect(getWrapper(page)).toHaveScreenshot(`superhero-${example.slug}.png`, {
          // Video frames change while autoplaying.
          mask: example.video ? [block.locator('video')] : [],
        });
      });
    });
  });

  test.describe('Responsive', () => {
    test('Default grows to fit its content below 1024px', async ({ page }) => {
      const block = await openSuperheroPage(page, 'default/with-text-and-background-color');
      expect((await block.boundingBox()).height).toBe(272);

      for (const viewport of [tabletViewport, mobileViewport]) {
        await page.setViewportSize(viewport);
        await expect.poll(() => block.evaluate((el) => el.getBoundingClientRect().height))
          .not.toBe(272);
        // Nothing is clipped by the block's overflow: hidden.
        expect(await block.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
        await expect(block.getByRole('link', { name: 'Get Started' })).toBeInViewport();
      }
      await expectNoHorizontalOverflow(page, block);
    });

    test('Half Width stacks text above media at 1024px and below', async ({ page }) => {
      const block = await openSuperheroPage(page, 'halfwidth/with-background-image');
      const textColumn = block.locator(':scope > div').first();
      const mediaColumn = block.locator(':scope > div').last();

      let text = await textColumn.boundingBox();
      let media = await mediaColumn.boundingBox();
      expect(text.x + text.width).toBeLessThanOrEqual(media.x);

      for (const viewport of [tabletViewport, mobileViewport]) {
        await page.setViewportSize(viewport);
        await expect.poll(async () => {
          text = await textColumn.boundingBox();
          media = await mediaColumn.boundingBox();
          return text.y + text.height <= media.y;
        }, { message: `media should stack below text at ${viewport.width}px` }).toBe(true);
        const blockBox = await block.boundingBox();
        expect(Math.round(text.width)).toBe(Math.round(blockBox.width));
        expect(Math.round(media.width)).toBe(Math.round(blockBox.width));
      }
      await expectNoHorizontalOverflow(page, block);
    });

    [
      { path: 'centered/', label: 'Centered', desktop: 350, mobileRatio: 0.75 },
      { path: 'centeredxl/', label: 'Centered XL', desktop: 624, mobileRatio: 1 },
    ].forEach(({ path, label, desktop, mobileRatio }) => {
      test(`${label} keeps its height on tablet and fills the mobile viewport`, async ({ page }) => {
        const block = await openSuperheroPage(page, path);
        const content = block.locator('.superhero-content');
        expect((await block.boundingBox()).height).toBe(desktop);

        await page.setViewportSize(tabletViewport);
        await expect.poll(async () => (await block.boundingBox()).height).toBe(desktop);
        await expect(content).toHaveCSS('padding-left', '32px');

        await page.setViewportSize(mobileViewport);
        await expect.poll(async () => (await block.boundingBox()).height)
          .toBeCloseTo(mobileViewport.height * mobileRatio, 0);
        await expect(content).toHaveCSS('padding-left', '32px');
        await expect(block.getByRole('heading', { name: headingText })).toBeVisible();
        await expectNoHorizontalOverflow(page, block);
      });
    });
  });

  test.describe('Contrast', () => {
    allExamples
      .filter((example) => !example.image && !example.backgroundImage)
      .forEach((example) => {
        test(`${example.slug} text meets WCAG AA contrast`, async ({ page }) => {
          // Known issue: 20px white body text on the default rgb(29, 125, 238)
          // background is 4.02:1, below the 4.5:1 AA minimum. Remove test.fail once fixed.
          test.fail(example.background === defaultBlue);
          const block = await openSuperheroPage(page, example.path);
          const backgroundOwner = example.variantClass === 'half-width' ? getWrapper(page) : block;
          const background = parseRgb(await backgroundOwner.evaluate(
            (el) => getComputedStyle(el).backgroundColor,
          ));

          for (const [label, locator] of [
            ['heading', block.getByRole('heading', { name: headingText })],
            ['description', block.getByText(descriptionText, { exact: true })],
          ]) {
            const style = await textStyle(locator);
            const ratio = contrastRatio(parseRgb(style.color), background);
            expect(ratio, `${label} contrast ${ratio.toFixed(2)}:1 at ${style.fontSize}px`)
              .toBeGreaterThanOrEqual(requiredContrast(style));
          }
        });
      });
  });
});
