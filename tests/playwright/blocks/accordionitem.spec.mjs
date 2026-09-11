import { expect, test } from '@playwright/test';

const path = '/dev-docs-reference/blocks/accordion/';
const heading = 'What is this accordion component?';
const body = 'This is a collapsible content section that can expand and collapse when users click on the heading.';
const basicAccordionHeadings = [
  heading,
  'How does it work?',
  'Can I use multiple accordions?',
];
const complexAccordions = [
  {
    heading: '1. Initial Setup',
    snapshot: 'accordion-initial-setup-expanded.png',
    contentCount: 3,
    readySelector: '.code-toolbar',
  },
  {
    heading: '2. Status Check',
    snapshot: 'accordion-status-check-expanded.png',
    contentCount: 2,
    readySelector: 'table.spectrum-Table',
  },
];
const hideFeedback = '.contributors-wrapper-container { visibility: hidden !important; }';

function getAccordionItem(page, name) {
  const button = page.getByRole('button', { name, exact: true });
  return {
    button,
    item: page.locator('.accordionitem > div').filter({ has: button }),
  };
}

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

test.describe('AccordionItem reference', () => {
  test.beforeEach(async ({ page }) => openAccordionPage(page));

  test('expands and collapses an item', async ({ page }) => {
    const { button, item } = getAccordionItem(page, heading);
    const content = item.locator('.accordion-itemContent');

    await expect(button).toBeVisible();
    await expect(content).toBeHidden();

    await button.click();
    await expect(content).toBeVisible();
    await expect(content).toContainText(body);

    await button.click();
    await expect(content).toBeHidden();
  });

  test('allows all basic accordions to be open at once', async ({ page }) => {
    const accordions = basicAccordionHeadings.map((name) => getAccordionItem(page, name));

    for (const { button, item } of accordions) {
      await expect(item.locator('.accordion-itemContent')).toBeHidden();
      await button.click();
    }

    for (const { item } of accordions) {
      await expect(item.locator('.accordion-itemContent')).toBeVisible();
    }
    await expect(page.locator('.accordion-itemContent:visible')).toHaveCount(3);
  });

  test('matches collapsed and expanded visuals', async ({ page }) => {
    const { button, item } = getAccordionItem(page, heading);
    const content = item.locator('.accordion-itemContent');

    await expect(item).toHaveScreenshot('accordion-collapsed.png');

    await button.click();
    await expect(content).toBeVisible();
    await expect(item).toHaveScreenshot('accordion-expanded.png');
  });

  test('matches complex accordion visuals', async ({ page }) => {
    await page.addStyleTag({ content: hideFeedback });

    for (const {
      heading: complexHeading,
      snapshot,
      contentCount,
      readySelector,
    } of complexAccordions) {
      const { button, item } = getAccordionItem(page, complexHeading);

      await button.click();
      await expect(item.locator('.accordion-itemContent:visible')).toHaveCount(contentCount);
      await expect(item.locator(readySelector)).toBeVisible();
      await expect(item).toHaveScreenshot(snapshot);
    }
  });
});
