import { expect, test } from '@playwright/test';
import { openDevDocsReferencePage } from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/fragment/';
const checklistHeading = 'Reusable release checklist';
const checklistItems = [
  'Confirm the steps match the current product experience.',
  'Check that links and code samples work.',
  'Ask a teammate to review the update.',
];

async function openFragmentReferencePage(page) {
  await openDevDocsReferencePage(page, { path, heading: 'Fragment Block' });
}

async function expectChecklist(page) {
  const heading = page.getByRole('heading', { level: 3, name: checklistHeading, exact: true });
  await expect(heading).toBeVisible();

  // The fragment wrapper is replaced, so wait for the imported heading's
  // decoration and section loading rather than the fragment's block status.
  const headingBlock = heading.locator('xpath=ancestor::*[@data-block-name="heading3"][1]');
  await expect(headingBlock).toHaveAttribute('data-block-status', 'loaded');
  const section = heading.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " section ")][1]');
  await expect(section).toHaveAttribute('data-section-status', 'loaded');
  await expect(section.getByText('Use this checklist before publishing a documentation update:')).toBeVisible();
  const list = section.getByRole('list');
  await expect(list).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveText(checklistItems);
}

test.describe('Fragment reference', () => {
  test('renders and decorates the referenced content in place', async ({ page }) => {
    await openFragmentReferencePage(page);
    await expectChecklist(page);

    await expect(page.locator('main .fragment-wrapper')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Example', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Parameters', exact: true })).toBeVisible();
    await expect(page.locator('main h2, main h3')).toContainText([
      'Example',
      checklistHeading,
      'Parameters',
    ]);
  });

  test('reuses the cached fragment on reload', async ({ page }) => {
    let fragmentRequests = 0;
    // Routing also disables the browser HTTP cache, making a second fetch observable.
    await page.route(/\/dev-docs-reference\/blocks\/fragment\/example-content\.(?:md|plain\.html)(?:\?.*)?$/, (route) => {
      fragmentRequests += 1;
      return route.continue();
    });

    await openFragmentReferencePage(page);
    await expectChecklist(page);
    expect(fragmentRequests).toBe(1);

    const response = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(response, 'the reloaded reference page should return an HTTP response').not.toBeNull();
    expect(response.ok(), `reloaded reference page returned ${response.status()}`).toBeTruthy();
    await expectChecklist(page);
    expect(fragmentRequests).toBe(1);
  });
});
