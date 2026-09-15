import { expect, test } from '@playwright/test';
import { hideNonComponentContent } from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/announcement/';
const devBizPath = '/tools/sidekick/blocks/announcement';
const examples = [
  {
    name: 'full announcement with secondary variant',
    heading: 'New Release Available',
    body: 'Check out the latest features and improvements in version 2.0.',
    button: 'Read more',
    snapshot: 'announcement-secondary.png',
  },
  {
    name: 'button-only announcement',
    button: 'Get Started',
    snapshot: 'announcement-button-only.png',
  },
  {
    name: 'primary variant announcement',
    heading: 'Important Update',
    body: 'Review these changes before your next deployment.',
    button: 'View details',
    snapshot: 'announcement-primary.png',
  },
];

function getAnnouncement(page, buttonName) {
  return page
    .locator('.announcement.block')
    .filter({ has: page.getByRole('link', { name: buttonName, exact: true }) });
}

async function openAnnouncementPage(page) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, 'the reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `reference page returned ${response.status()}`).toBeTruthy();

  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Announcement Block',
  })).toBeVisible();

  // Font completion is relevant to screenshot stability. Do not wait for
  // networkidle; assert the specific UI readiness conditions instead.
  await page.evaluate(() => document.fonts.ready);

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
      const block = getAnnouncement(page, example.button);

      await expect(block).toHaveCount(1);
      if (example.heading) {
        await expect(block.getByRole('heading', { name: example.heading })).toBeVisible();
        await expect(block).toContainText(example.body);
      }
      await expect(block.getByRole('link', { name: example.button, exact: true })).toBeVisible();
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
    const wrappers = page.locator('.announcement-wrapper');

    await expect(wrappers).toHaveCount(4);
    await expect(wrappers.nth(0).locator('.announcement')).toHaveClass(/background-color-gray/);

    const assertBackgroundImage = async (index) => {
      const wrapper = wrappers.nth(index);
      const image = wrapper.locator('picture img');

      await expect(image).toHaveJSProperty('complete', true);
      await expect(wrapper.locator('picture').locator('..')).toBeHidden();
      await expect.poll(async () => wrapper.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
      )).not.toBe('none');
    };
    await Promise.all(Array.from({ length: 3 }, (_, index) => assertBackgroundImage(index + 1)));
  });

  test('matches visuals for each DevBiz variant', async ({ page }) => {
    await hideNonComponentContent(page);

    const variants = [
      { className: /background-color-gray/, snapshot: 'announcement-devbiz-gray.png' },
      { className: /font-white/, snapshot: 'announcement-devbiz-font-white.png' },
      { className: /(^| )end( |$)/, snapshot: 'announcement-devbiz-end.png' },
      { className: /secondary-font-white/, snapshot: 'announcement-devbiz-secondary.png' },
    ];

    await variants.reduce(async (previous, variant, index) => {
      await previous;
      const wrapper = page.locator('.announcement-wrapper').nth(index);
      await expect(wrapper.locator('.announcement')).toHaveClass(variant.className);
      await expect(wrapper).toHaveScreenshot(variant.snapshot);
    }, Promise.resolve());
  });
});
