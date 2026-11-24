import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/details/';
const summaryText = 'Getting Started Workflows';
const subText = 'Choose your workflow:';
const workflows = [
  { name: 'Workflow A:', steps: ['Step one', 'Step two', 'Step three'] },
  { name: 'Workflow B:', steps: ['Step one', 'Step two', 'Step three'] },
];

async function openDetailsReferencePage(page) {
  await openDevDocsReferencePage(page, {
    path,
    heading: 'Details Block',
  });

  // The page heading is authored content. The generated native details element
  // proves the block has completed its asynchronous decoration.
  const blocks = page.locator('.details.block');
  await expect(blocks).toHaveCount(1);
  await expect(blocks).toHaveAttribute('data-block-status', 'loaded');
  await expect(blocks.locator(':scope > details')).toHaveCount(1);

  return blocks;
}

function detailsIn(block) {
  return block.locator(':scope > details');
}

async function expectWorkflowContent(details) {
  await expect(details.locator(':scope > summary')).toHaveText(summaryText);
  await expect(details.locator(':scope > p')).toHaveText(subText);

  const workflowItems = details.locator(':scope > div > div > ul > li');
  await expect(workflowItems).toHaveCount(workflows.length);
  for (let index = 0; index < workflows.length; index += 1) {
    const workflow = workflowItems.nth(index);
    await expect(workflow.locator(':scope > p')).toHaveText(workflows[index].name);
    await expect(workflow.locator(':scope > ol > li')).toHaveText(workflows[index].steps);
  }

  return workflowItems;
}

async function clearScreenshotInteraction(page) {
  // The expanded baseline represents the resting open state, not focus or
  // pointer styling left by clicking the summary.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(1279, 899);
}

test.describe('Details reference', () => {
  test.beforeEach(async ({ page }) => openDetailsReferencePage(page));

  test('decorates the workflow content into native details markup', async ({ page }) => {
    const details = detailsIn(page.locator('.details.block'));

    await expect(details).not.toHaveAttribute('open', '');
    await expectWorkflowContent(details);
  });

  test('expands and collapses the workflow content from its summary', async ({ page }) => {
    const details = detailsIn(page.locator('.details.block'));
    const summary = details.locator(':scope > summary');
    const description = details.locator(':scope > p');
    const workflowsList = details.locator(':scope > div > div > ul');

    await expect(description).toBeHidden();
    await expect(workflowsList).toBeHidden();

    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(description).toBeVisible();
    await expect(workflowsList).toBeVisible();
    await expectWorkflowContent(details);

    await summary.click();
    await expect(details).not.toHaveAttribute('open', '');
    await expect(description).toBeHidden();
    await expect(workflowsList).toBeHidden();
  });

  test('matches collapsed and expanded visuals', async ({ page }) => {
    const block = page.locator('.details.block');
    const details = detailsIn(block);
    const summary = details.locator(':scope > summary');
    const description = details.locator(':scope > p');
    const workflowsList = details.locator(':scope > div > div > ul');

    await hideNonComponentContent(page);
    await expectWorkflowContent(details);
    await expect(description).toBeHidden();
    await expect(workflowsList).toBeHidden();
    await clearScreenshotInteraction(page);
    await expect(block).toHaveScreenshot('details-collapsed.png');

    await summary.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(description).toBeVisible();
    await expect(workflowsList).toBeVisible();
    await expectWorkflowContent(details);
    await clearScreenshotInteraction(page);
    await expect(block).toHaveScreenshot('details-expanded.png');
  });
});
