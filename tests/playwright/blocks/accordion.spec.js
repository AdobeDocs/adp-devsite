const { test, expect } = require('@playwright/test');

const path = '/dev-docs-reference/blocks/accordion/';
const heading = 'What is this accordion component?';
const body = 'This is a collapsible content section that can expand and collapse when users click on the heading.';

async function openAccordionPage(page) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, 'the reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `reference page returned ${response.status()}`).toBeTruthy();

  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Accordion Block',
  })).toBeVisible();

  // Font completion is relevant to screenshot stability. Do not wait for
  // networkidle; assert the specific UI readiness conditions instead.
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Accordion reference', () => {
  test.beforeEach(async ({ page }) => openAccordionPage(page));

  test('expands and collapses an item', async ({ page }) => {
    const button = page.getByRole('button', { name: heading });
    const item = page.locator('.accordionitem > div').filter({ has: button });
    const content = item.locator('.accordion-itemContent');

    await expect(button).toBeVisible();
    await expect(content).toBeHidden();

    await button.click();
    await expect(content).toBeVisible();
    await expect(content).toContainText(body);

    await button.click();
    await expect(content).toBeHidden();
  });

  test('matches collapsed and expanded visuals', async ({ page }) => {
    const button = page.getByRole('button', { name: heading });
    const item = page.locator('.accordionitem > div').filter({ has: button });
    const content = item.locator('.accordion-itemContent');

    await expect(item).toHaveScreenshot('accordion-collapsed.png');

    await button.click();
    await expect(content).toBeVisible();
    await expect(item).toHaveScreenshot('accordion-expanded.png');
  });
});
