import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/announcement/';
const devBizPath = '/tools/sidekick/blocks/announcement';
// The `secondary` variant keeps its first link as an outline button; every
// other variant promotes it to the primary call to action.
const primaryButton = [/spectrum-Button--fill/, /spectrum-Button--accent/];
const secondaryButton = [/spectrum-Button--outline/, /spectrum-Button--secondary/];
const examples = [
  {
    name: 'full announcement with secondary variant',
    heading: 'New Release Available',
    body: 'Check out the latest features and improvements in version 2.0.',
    button: 'Read more',
    buttonClasses: secondaryButton,
    snapshot: 'announcement-secondary.png',
  },
  {
    name: 'button-only announcement',
    button: 'Get Started',
    buttonClasses: primaryButton,
    snapshot: 'announcement-button-only.png',
  },
  {
    name: 'primary variant announcement',
    heading: 'Important Update',
    body: 'Review these changes before your next deployment.',
    button: 'View details',
    buttonClasses: primaryButton,
    snapshot: 'announcement-primary.png',
  },
];

function getAnnouncement(page, buttonName) {
  return page
    .locator('.announcement.block')
    .filter({ has: page.getByRole('link', { name: buttonName, exact: true }) });
}

async function openAnnouncementPage(page) {
  await openDevDocsReferencePage(page, {
    path,
    heading: 'Announcement Block',
  });

  // Block decoration runs asynchronously. Wait until every example has been
  // loaded and its links rearranged into a button container before comparing
  // pixels.
  await expect(page.locator('.announcement.block[data-block-status="loaded"]')).toHaveCount(3);
  await expect(page.locator('.announcement .announcement-button-container')).toHaveCount(3);
}

test.describe('Announcement reference', () => {
  test.beforeEach(async ({ page }) => openAnnouncementPage(page));

  examples.forEach((example) => {
    test(`matches ${example.name} visuals`, async ({ page }) => {
      await hideNonComponentContent(page);

      const block = getAnnouncement(page, example.button);

      await expect(block).toHaveCount(1);
      if (example.heading) {
        await expect(block.getByRole('heading', { name: example.heading })).toBeVisible();
        await expect(block).toContainText(example.body);
      }
      const button = block.getByRole('link', { name: example.button, exact: true });
      await expect(button).toBeVisible();
      await Promise.all(example.buttonClasses.map((className) => (
        expect(button).toHaveClass(className)
      )));
      await expect(block).toHaveScreenshot(example.snapshot);
    });
  });
});

async function openDevBizAnnouncementPage(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz page returned ${response.status()}`).toBeTruthy();

  // The DevBiz page contains four examples. The button containers are added by
  // announcement decoration, so they provide a more useful readiness check
  // than the authored headings.
  await expect(page.locator('.announcement.block[data-block-status="loaded"]')).toHaveCount(4);
  await expect(page.locator('.announcement .announcement-button-container')).toHaveCount(4);
  await page.evaluate(() => document.fonts.ready);
}

// Authored order on the DevBiz page is part of the fixture contract. Each
// class pattern matches whole class names so `font-white` cannot also match
// `secondary-font-white`.
const devBizVariants = [
  { className: /(^|\s)background-color-gray(\s|$)/, snapshot: 'announcement-devbiz-gray.png' },
  {
    className: /(^|\s)font-white(\s|$)/,
    hasBackgroundImage: true,
    snapshot: 'announcement-devbiz-font-white.png',
  },
  {
    className: /(^|\s)end(\s|$)/,
    hasBackgroundImage: true,
    snapshot: 'announcement-devbiz-end.png',
  },
  {
    className: /(^|\s)secondary-font-white(\s|$)/,
    hasBackgroundImage: true,
    snapshot: 'announcement-devbiz-secondary.png',
  },
];

async function getDevBizWrapper(page, index) {
  const wrappers = page.locator('.announcement-wrapper');
  await expect(wrappers).toHaveCount(devBizVariants.length);

  const wrapper = wrappers.nth(index);
  await expect(wrapper.locator('.announcement')).toHaveClass(devBizVariants[index].className);
  return wrapper;
}

async function expectAuthoredBackgroundLoaded(wrapper) {
  const image = wrapper.locator('picture img');

  await expect(image).toHaveCount(1);
  // Decoration hides the authored picture and reuses its source as the wrapper
  // background. Scroll the visible wrapper, not the hidden image, so a lazy
  // image can load before its pixels are compared.
  await wrapper.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (
    element.complete && element.naturalWidth > 0
  ))).toBe(true);
  await expect(wrapper.locator('picture').locator('..')).toBeHidden();
  // Decoration should use this authored image, not just set any background image.
  await expect.poll(() => wrapper.evaluate((element) => {
    const authoredImage = element.querySelector('picture img');
    return authoredImage
      && getComputedStyle(element).backgroundImage === `url("${authoredImage.src}")`;
  })).toBe(true);
}

test.describe('Announcement DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openDevBizAnnouncementPage(page));

  test('decorates primary and secondary links as buttons', async ({ page }) => {
    const announcements = page.locator('.announcement.block');

    await expect(announcements).toHaveCount(4);
    const assertButtons = async (index) => {
      const links = announcements.nth(index).locator('.announcement-button-container a');

      await expect(links).toHaveCount(2);
      await expect(links.nth(0)).toHaveClass(/spectrum-Button--fill/);
      await expect(links.nth(0)).toHaveClass(/spectrum-Button--accent/);
      await expect(links.nth(1)).toHaveClass(/spectrum-Button--outline/);
      await expect(links.nth(1)).toHaveClass(/spectrum-Button--secondary/);
    };
    await Promise.all(Array.from({ length: 4 }, (_, index) => assertButtons(index)));
  });

  test('uses the authored image as the announcement background', async ({ page }) => {
    const gray = await getDevBizWrapper(page, 0);
    await expect(gray.locator('picture img')).toHaveCount(0);

    await Promise.all(devBizVariants.map(async (variant, index) => {
      if (variant.hasBackgroundImage) {
        await expectAuthoredBackgroundLoaded(await getDevBizWrapper(page, index));
      }
    }));
  });

  devBizVariants.forEach((variant, index) => {
    test(`matches the ${variant.snapshot} DevBiz visual`, async ({ page }) => {
      await hideNonComponentContent(page);

      const wrapper = await getDevBizWrapper(page, index);
      if (variant.hasBackgroundImage) await expectAuthoredBackgroundLoaded(wrapper);
      await page.evaluate(() => document.fonts.ready);
      await expect(wrapper).toHaveScreenshot(variant.snapshot);
    });
  });
});
