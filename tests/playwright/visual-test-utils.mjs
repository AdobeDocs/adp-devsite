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

// Matches the code samples that hlx_statics/scripts/scripts.js observes before
// it loads Prism.
const codeSampleSelector = 'code[class*="language-"], [class*="language-"] code';

/**
 * Waits for the DevDocs page decoration that runs after the blocks have loaded.
 *
 * After loadLazy(), loadPage() adds the GitHub actions bar above the H1. It
 * also loads Prism when a code sample is within 200px of the viewport. Prism
 * then highlights every sample on the page. Both steps move the blocks below
 * them. Waiting for only part of this work can leave a block at a different
 * sub-pixel offset from the final page. That shifts its screenshot by 1px.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForLateDevDocsLayout(page) {
  if (await page.locator('meta[name="githubblobpath"]').count()) {
    await expect(page.locator('.github-actions-wrapper')).toBeAttached();
  }

  // A page opened at a hash can start with every sample out of range. Prism
  // does not load then, so there is nothing to wait for.
  const prismWillLoad = await page.evaluate((selector) => (
    [...document.querySelectorAll(selector)].some((code) => {
      const { top, bottom, height } = code.getBoundingClientRect();
      return height > 0 && bottom > -200 && top < window.innerHeight + 200;
    })
  ), codeSampleSelector);
  if (!prismWillLoad) return;

  await expect.poll(() => page.evaluate((selector) => {
    const prismStyles = document.querySelector('link[href$="/styles/prism.css"]');
    return Boolean(window.Prism?.highlightAll && prismStyles?.sheet)
      && !document.querySelector('pre.prism-loading')
      && [...document.querySelectorAll(selector)]
        .every((code) => code.querySelector('.token, .line-numbers-rows'));
  }, codeSampleSelector), 'Prism should finish highlighting the code samples').toBe(true);
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
  await waitForLateDevDocsLayout(page);
}
