import { expect, test } from '@playwright/test';

const path = '/tools/sidekick/blocks/accordion';
const body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';
const metadataStyle = `
  .library-metadata { display: none !important; }
  .contributors-wrapper-container { visibility: hidden !important; }
  .ai-assistant-wrapper,
  *[data-block-name="ai-assistant"] { display: none !important; }
`;

function getVariant(page, variant = 'default') {
  const selector = variant === 'white'
    ? '.accordion.background-color-white.block'
    : '.accordion.block:not(.background-color-white)';
  return page.locator(selector);
}

function getAccordionItem(variant, index) {
  const item = variant.locator('.accordion-item').nth(index);
  return {
    button: item.locator('button.accordion-itemHeader'),
    content: item.locator('.accordion-itemContent'),
  };
}

async function openAccordionPage(page) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, 'the reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `reference page returned ${response.status()}`).toBeTruthy();

  // The page has two variants with four decorated item buttons each. This is
  // the readiness check; the page headings are authored content, not a signal
  // that the accordion block has finished decorating.
  await expect(page.locator('.accordion.block .accordion-item button')).toHaveCount(8);

  // Font completion is relevant to screenshot stability. Do not wait for
  // networkidle; assert the specific UI readiness conditions instead.
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Accordion reference', () => {
  test.beforeEach(async ({ page }) => openAccordionPage(page));

  test('expands and collapses an item', async ({ page }) => {
    const variant = getVariant(page);
    const { button, content } = getAccordionItem(variant, 0);

    await expect(content).toBeHidden();

    await button.click();
    await expect(content).toBeVisible();
    await expect(content).toContainText(body);

    await button.click();
    await expect(content).toBeHidden();
  });

  test('allows all items to be open at once', async ({ page }) => {
    const variant = getVariant(page);

    const items = Array.from({ length: 4 }, (_, index) => getAccordionItem(variant, index));
    await items.reduce(async (previous, { button, content }) => {
      await previous;
      await expect(content).toBeHidden();
      await button.click();
    }, Promise.resolve());

    await expect(variant.locator('.accordion-itemContent:visible')).toHaveCount(4);
  });

  test('keeps variants independent', async ({ page }) => {
    const defaultVariant = getVariant(page);
    const whiteVariant = getVariant(page, 'white');
    const defaultItem = getAccordionItem(defaultVariant, 0);
    const whiteItem = getAccordionItem(whiteVariant, 0);

    await whiteItem.button.click();
    await expect(whiteItem.content).toBeVisible();
    await expect(defaultVariant.locator('.accordion-itemContent:visible')).toHaveCount(0);

    await defaultItem.button.click();
    await expect(defaultItem.content).toBeVisible();
    await expect(whiteItem.content).toBeVisible();
  });

  test('matches visual snapshots for each variant', async ({ page }) => {
    await page.addStyleTag({ content: metadataStyle });

    const variants = [
      {
        locator: getVariant(page),
        collapsed: 'accordion-collapsed.png',
        expanded: 'accordion-expanded.png',
      },
      {
        locator: getVariant(page, 'white'),
        collapsed: 'accordion-white-collapsed.png',
        expanded: 'accordion-white-expanded.png',
      },
    ];

    await variants.reduce(async (previous, variant) => {
      await previous;
      await expect(variant.locator).toHaveScreenshot(variant.collapsed);

      const { button, content } = getAccordionItem(variant.locator, 0);
      await button.click();
      await expect(content).toBeVisible();
      await expect(variant.locator).toHaveScreenshot(variant.expanded);
    }, Promise.resolve());
  });
});
