import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const devDocsPath = '/dev-docs-reference/blocks/table/';
const devBizPath = '/tools/sidekick/blocks/table';
const whiteBackground = 'rgb(255, 255, 255)';
const grayBackground = 'rgb(245, 245, 245)';
const devDocsExamples = [
  {
    name: 'standard table',
    firstHeader: 'Month',
    headers: ['Month', 'Savings'],
    rows: [
      ['January', '$250'],
      ['February', '$80'],
      ['March', '$420'],
    ],
    snapshot: 'table-devdocs-standard.png',
  },
  {
    name: 'multiline-cell table',
    firstHeader: 'Parameter',
    headers: ['Parameter', 'Values'],
    rows: [
      { label: 'color', values: ['• red', '• green', '• blue'], lineBreaks: 2 },
      { label: 'size', values: ['• small', '• medium', '• large'], lineBreaks: 2 },
    ],
    snapshot: 'table-devdocs-multiline.png',
  },
];
const devBizHeaders = [
  '',
  'Lorem ipsum dolor',
  'Quisque faucibus',
  'Dolor sit amet',
  'Tempus leo eu aenean',
  'In id cursus mi',
  'Ut hendrerit semper',
  'Ad litora torquent',
];
const devBizRowLabels = [
  'Lorem ipsum dolor',
  'Quisque faucibus',
  'Dolor sit amet',
  'Tempus leo eu aenean',
  'In id cursus mi',
  'Ut hendrerit semper',
  'Ad litora torquent',
];
const devBizFirstRow = [
  'Lorem ipsum dolor',
  '> 22',
  'sit amet consectetur',
  'n/a',
  'faucibus',
  'Beginner',
  'Yes',
  'Free',
];
const devBizVariants = [
  {
    name: 'default gray',
    selector: 'main .table.block:not(.background-color-white)',
    metadataName: 'Table',
    backgroundColor: grayBackground,
    snapshot: 'table-devbiz-default.png',
  },
  {
    name: 'white background',
    selector: 'main .table.block.background-color-white',
    metadataName: 'Table with white background',
    backgroundColor: whiteBackground,
    snapshot: 'table-devbiz-white.png',
  },
];

function wrapperOf(block) {
  return block.locator('..');
}

function devDocsBlock(page, example) {
  return page.locator('main .table.block').filter({
    has: page.getByRole('columnheader', {
      name: example.firstHeader,
      exact: true,
    }),
  });
}

function devBizBlock(page, variant) {
  return page.locator(variant.selector);
}

function libraryMetadataFor(block) {
  return wrapperOf(block).locator('xpath=following-sibling::*[1]');
}

async function expectSpectrumTable(block, { headerCount, rowCount }) {
  const table = block.locator(':scope > table');
  const headerCells = table.locator(':scope > thead > tr > th');
  const bodyRows = table.locator(':scope > tbody > tr');

  await expect(block).toHaveAttribute('data-block-status', 'loaded');
  await expect(block).toHaveAttribute('daa-lh', 'table');
  await expect(block).toHaveAttribute('dir', 'ltr');
  await expect(table).toHaveCount(1);
  await expect(table).toHaveClass(/\bspectrum-Table\b/);
  await expect(table).toHaveClass(/\bspectrum-Table--sizeM\b/);
  await expect(table).toHaveClass(/\bspectrum-Table--spacious\b/);
  await expect(table.locator(':scope > thead.spectrum-Table-head')).toHaveCount(1);
  await expect(table.locator(':scope > tbody.spectrum-Table-body')).toHaveCount(1);
  await expect(headerCells).toHaveCount(headerCount);
  await expect(bodyRows).toHaveCount(rowCount);

  for (let index = 0; index < headerCount; index += 1) {
    await expect(headerCells.nth(index)).toHaveClass(/\bspectrum-Table-headCell\b/);
    await expect(headerCells.nth(index)).toHaveAttribute('scope', 'col');
  }
  for (let index = 0; index < rowCount; index += 1) {
    const row = bodyRows.nth(index);
    await expect(row).toHaveClass(/\bspectrum-Table-row\b/);
    await expect(row.locator(':scope > td.spectrum-Table-cell'))
      .toHaveCount(headerCount);
  }

  return table;
}

async function openDevDocsTablePage(page) {
  await openDevDocsReferencePage(page, {
    path: devDocsPath,
    heading: 'Table',
  });

  const blocks = page.locator('main .table.block');
  await expect(blocks).toHaveCount(devDocsExamples.length);
  await expect(page.locator('main .table.block[data-block-status="loaded"]'))
    .toHaveCount(devDocsExamples.length);

  for (const example of devDocsExamples) {
    const block = devDocsBlock(page, example);
    await expect(block, `${example.name} should be uniquely identifiable`).toHaveCount(1);
    await expect(block).toHaveClass(/\bbackground-color-white\b/);
  }
}

async function expectDevDocsExample(page, example) {
  const block = devDocsBlock(page, example);
  const table = await expectSpectrumTable(block, {
    headerCount: example.headers.length,
    rowCount: example.rows.length,
  });

  await expect(block).toHaveClass(/\bbackground-color-white\b/);
  await expect(wrapperOf(block)).toHaveCSS('background-color', whiteBackground);
  await expect(wrapperOf(block)).toHaveCSS('overflow-x', 'auto');
  await expect(table.locator('thead th')).toHaveText(example.headers);

  return { block, table };
}

async function openDevBizTablePage(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  const blocks = page.locator('main .table.block');
  await expect(blocks).toHaveCount(devBizVariants.length);
  await expect(page.locator('main .table.block[data-block-status="loaded"]'))
    .toHaveCount(devBizVariants.length);

  for (const variant of devBizVariants) {
    const block = devBizBlock(page, variant);
    await expect(block, `${variant.name} should be uniquely identifiable`).toHaveCount(1);
    await expect(libraryMetadataFor(block)).toHaveClass(/\blibrary-metadata\b/);
    await expect(libraryMetadataFor(block)).toContainText(variant.metadataName);
  }

  await page.evaluate(() => document.fonts.ready);
}

async function expectDevBizVariant(page, variant) {
  const block = devBizBlock(page, variant);
  const table = await expectSpectrumTable(block, {
    headerCount: devBizHeaders.length,
    rowCount: devBizRowLabels.length,
  });

  if (variant.backgroundColor === whiteBackground) {
    await expect(block).toHaveClass(/\bbackground-color-white\b/);
  } else {
    await expect(block).not.toHaveClass(/\bbackground-color-white\b/);
  }
  await expect(wrapperOf(block)).toHaveCSS('background-color', variant.backgroundColor);
  await expect(wrapperOf(block)).toHaveCSS('overflow-x', 'auto');

  return { block, table };
}

async function prepareScreenshot(page, target) {
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await hideNonComponentContent(page);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(1279, 899);
}

test.describe('Table DevDocs reference', () => {
  test.beforeEach(async ({ page }) => openDevDocsTablePage(page));

  test('decorates both Markdown examples as semantic tables', async ({ page }) => {
    for (const example of devDocsExamples) {
      await expectDevDocsExample(page, example);
    }
  });

  test('preserves standard values and converts escaped breaks inside cells', async ({ page }) => {
    const { table: standardTable } = await expectDevDocsExample(page, devDocsExamples[0]);
    const standardRows = standardTable.locator('tbody > tr');

    for (let index = 0; index < devDocsExamples[0].rows.length; index += 1) {
      await expect(standardRows.nth(index).locator(':scope > td'))
        .toHaveText(devDocsExamples[0].rows[index]);
    }

    const multilineExample = devDocsExamples[1];
    const { table: multilineTable } = await expectDevDocsExample(page, multilineExample);
    const multilineRows = multilineTable.locator('tbody > tr');

    for (let index = 0; index < multilineExample.rows.length; index += 1) {
      const expected = multilineExample.rows[index];
      const cells = multilineRows.nth(index).locator(':scope > td');
      const valueCell = cells.nth(1);

      await expect(cells.nth(0)).toHaveText(expected.label);
      await expect(valueCell.locator('br')).toHaveCount(expected.lineBreaks);
      for (const value of expected.values) {
        await expect(valueCell).toContainText(value);
      }
    }
  });

  for (const example of devDocsExamples) {
    test(`matches the ${example.name} visual`, async ({ page }) => {
      const { block } = await expectDevDocsExample(page, example);
      const wrapper = wrapperOf(block);

      await prepareScreenshot(page, wrapper);
      await expect(wrapper).toHaveScreenshot(example.snapshot);
    });
  }
});

test.describe('Table DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openDevBizTablePage(page));

  test('decorates the default and white variants as complete tables', async ({ page }) => {
    for (const variant of devBizVariants) {
      const { table } = await expectDevBizVariant(page, variant);

      await expect(table.locator('thead th')).toHaveText(devBizHeaders);
      await expect(table.locator('tbody > tr > td:first-child strong'))
        .toHaveText(devBizRowLabels);
    }
  });

  test('preserves authored wide-table content and row alignment', async ({ page }) => {
    const { table } = await expectDevBizVariant(page, devBizVariants[0]);
    const firstRow = table.locator('tbody > tr').first();

    await expect(table.locator('thead th')).toHaveText(devBizHeaders);
    await expect(firstRow.locator(':scope > td')).toHaveText(devBizFirstRow);
    await expect(firstRow.locator(':scope > td').nth(4)).toHaveText('faucibus');
    await expect(firstRow.locator(':scope > td').last()).toHaveText('Free');
  });

  test('uses gray by default and white for the background-color-white variant', async ({
    page,
  }) => {
    for (const variant of devBizVariants) {
      await expectDevBizVariant(page, variant);
    }
  });

  for (const variant of devBizVariants) {
    test(`matches the ${variant.name} visual`, async ({ page }) => {
      const { block } = await expectDevBizVariant(page, variant);
      const wrapper = wrapperOf(block);

      await prepareScreenshot(page, wrapper);
      await expect(wrapper).toHaveScreenshot(variant.snapshot);
    });
  }
});
