import { expect, test } from '@playwright/test';

const path = '/dev-docs-reference/blocks/announcement/';
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
