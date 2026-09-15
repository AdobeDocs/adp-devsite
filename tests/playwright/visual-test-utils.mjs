const nonComponentContentStyle = `
  .library-metadata { display: none !important; }
  .contributors-wrapper-container { visibility: hidden !important; }
  .ai-assistant-wrapper,
  *[data-block-name="ai-assistant"] { display: none !important; }
`;

/**
 * Hides components that get in our way on DevBiz pages.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function hideNonComponentContent(page) {
  await page.addStyleTag({ content: nonComponentContentStyle });
}
