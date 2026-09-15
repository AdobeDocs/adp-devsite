import { expect } from '@playwright/test';

const nonComponentContentStyle = `
  .library-metadata { display: none !important; }
  .contributors-wrapper-container { visibility: hidden !important; }
  .ai-assistant-wrapper,
  *[data-block-name="ai-assistant"] { display: none !important; }
`;

/**
 * Hides components that get in our way on DevBiz and DevDocs pages.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function hideNonComponentContent(page) {
  await page.addStyleTag({ content: nonComponentContentStyle });
}

/**
 * Opens a DevDocs block reference page and waits for its shared readiness signals.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ path: string, heading: string }} options
 */
export async function openDevDocsReferencePage(page, { path, heading }) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, 'the reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `reference page returned ${response.status()}`).toBeTruthy();

  await expect(page.getByRole('heading', {
    level: 1,
    name: heading,
  })).toBeVisible();

  // Font completion is relevant to screenshot stability. Do not wait for
  // networkidle; assert the specific UI readiness conditions instead.
  await page.evaluate(() => document.fonts.ready);
}
