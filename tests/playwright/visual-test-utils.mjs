import { expect } from '@playwright/test';

const nonComponentContentStyle = `
  body > header { visibility: hidden !important; }
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

const codeSampleSelector = 'code[class*="language-"], [class*="language-"] code';

/**
 * Waits for Prism to finish highlighting the page's code samples.
 *
 * Prism loads only when a code sample comes near the viewport, so scroll the
 * code into view first. Returns at once when no code sample is near the
 * viewport.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function waitForPrismHighlighting(page) {
  const prismWillLoad = await page.evaluate((selector) => (
    [...document.querySelectorAll(selector)].some((code) => {
      const { top, bottom, height } = code.getBoundingClientRect();
      return height > 0 && bottom > -200 && top < window.innerHeight + 200;
    })
  ), codeSampleSelector);
  if (!prismWillLoad) return;

  await expect.poll(() => page.evaluate(async (selector) => {
    const prismStyles = document.querySelector('link[href$="/styles/prism.css"]');
    if (!window.Prism?.highlightAll || !prismStyles?.sheet || document.querySelector('pre.prism-loading')) {
      return false;
    }
    if (document.querySelector('script[src*="/prism-grammars/"]')) return false;
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    if (document.querySelector('script[src*="/prism-grammars/"]')) return false;

    return [...document.querySelectorAll(selector)].every((code) => (
      code.parentElement?.tagName !== 'PRE' || Boolean(code.closest('.code-toolbar'))
    ));
  }, codeSampleSelector), 'Prism should finish highlighting the code samples').toBe(true);
}

async function waitForLateDevDocsLayout(page) {
  if (await page.locator('meta[name="githubblobpath"]').count()) {
    await expect(page.locator('.github-actions-wrapper')).toBeAttached();
  }

  await waitForPrismHighlighting(page);
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
