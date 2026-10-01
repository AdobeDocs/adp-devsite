import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

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
function getAccordionItem(page, name) {
  const button = page.getByRole('button', { name, exact: true });
  return {
    button,
    item: page.locator('.accordionitem > div').filter({ has: button }),
  };
}

test.describe('AccordionItem reference', () => {
  test.beforeEach(async ({ page }) => openDevDocsReferencePage(page, {
    path,
    heading: 'Accordion Block',
  }));

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
    await hideNonComponentContent(page);

    const { button, item } = getAccordionItem(page, heading);
    const content = item.locator('.accordion-itemContent');

    await expect(item).toHaveScreenshot('accordion-collapsed.png');

    await button.click();
    await expect(content).toBeVisible();
    await expect(item).toHaveScreenshot('accordion-expanded.png');
  });

  test('matches complex accordion visuals', async ({ page }) => {
    await hideNonComponentContent(page);

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
