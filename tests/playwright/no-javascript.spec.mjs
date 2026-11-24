import { expect, test } from '@playwright/test';

const pagePath = '/dev-docs-reference/blocks/cards/';

test('shows page content when JavaScript is disabled', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

    expect(response, 'the reference page should return an HTTP response').not.toBeNull();
    expect(response.ok(), `reference page returned ${response.status()}`).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Cards Block' })).toBeVisible();
    await expect(page.locator('main')).toContainText('First Card');
  } finally {
    await context.close();
  }
});
