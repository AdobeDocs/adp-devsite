import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const pickerFixture = {
  path: '/dev-docs-reference/blocks/codeblock/code-block-with-picklist',
  heading: 'Code Block with Picklist',
  tabs: ['Client', 'Server'],
  options: ['client.js', 'client.py', 'server.js', 'server.py'],
  panels: [
    { language: 'javascript', text: "const response = await fetch('/api/items');" },
    { language: 'python', text: 'from urllib.request import urlopen' },
    { language: 'javascript', text: "app.get('/api/items', async (request, response) => {" },
    { language: 'python', text: "@app.get('/api/items')" },
  ],
};

const noPickerFixture = {
  path: '/dev-docs-reference/blocks/codeblock/code-block-without-picklist',
  heading: 'Code Block without Picklist',
  tabs: ['index.html', 'app.js', 'utils.js'],
  options: ['index.html', 'app.js', 'utils.js'],
  panels: [
    { language: 'html', text: '<!DOCTYPE html>' },
    { language: 'js', text: 'import { formatDate, validateInput } from "./utils.js";' },
    { language: 'js', text: 'export function formatDate(date) {' },
  ],
};

async function openCodeBlockReferencePage(page, fixture) {
  await openDevDocsReferencePage(page, fixture);

  const block = page.locator('.codeblock.block[data-block-status="loaded"]');
  await expect(block).toHaveCount(1);
  await expect(block.locator('.control-bar')).toHaveCount(1);
  await expect(block.locator('.code-toolbar')).toHaveCount(fixture.panels.length);
  await expect(block.getByRole('tab')).toHaveCount(fixture.tabs.length);
  await expect(block.locator('[role="tabpanel"]')).toHaveCount(fixture.panels.length);
  await expect(block.locator('select')).toHaveCount(1);
  await expect(block.locator('select option')).toHaveCount(fixture.options.length);

  return block;
}

async function expectCodePanels(block, panels) {
  const tabPanels = block.locator('[role="tabpanel"]');

  await expect(tabPanels).toHaveCount(panels.length);
  for (let index = 0; index < panels.length; index += 1) {
    const panel = tabPanels.nth(index);
    const code = panel.locator('code');

    await expect(code).toHaveCount(1);
    await expect(code).toHaveClass(new RegExp(`(^|\\s)language-${panels[index].language}(\\s|$)`));
    await expect(code).toContainText(panels[index].text);
  }
}

async function expectSelectedTab(block, name) {
  const selectedTabs = block.locator('[role="tab"][aria-selected="true"]');

  await expect(selectedTabs).toHaveCount(1);
  await expect(block.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
}

async function expectSelectedPickerOption(picker, label) {
  const selectedOptions = picker.locator('option:checked');

  await expect(selectedOptions).toHaveCount(1);
  await expect(selectedOptions).toHaveText(label);
}

async function expectVisiblePanel(block, index) {
  const panels = block.locator('[role="tabpanel"]');

  for (let panelIndex = 0; panelIndex < await panels.count(); panelIndex += 1) {
    if (panelIndex === index) {
      await expect(panels.nth(panelIndex)).toBeVisible();
    } else {
      await expect(panels.nth(panelIndex)).toBeHidden();
    }
  }
}

async function expectAllPanelsHidden(block) {
  const panels = block.locator('[role="tabpanel"]');

  for (let index = 0; index < await panels.count(); index += 1) {
    await expect(panels.nth(index)).toBeHidden();
  }
}

async function expectPickerOptions(page, block, visibleOptions) {
  const picker = block.locator('select');
  const options = picker.locator('option');

  await picker.click();
  await expect.poll(() => picker.evaluate((element) => element.matches(':open'))).toBe(true);
  for (let index = 0; index < await options.count(); index += 1) {
    const option = options.nth(index);
    const optionText = await option.textContent();

    if (visibleOptions.includes(optionText)) {
      await expect(option).toBeVisible();
    } else {
      await expect(option).toBeHidden();
    }
  }
  await page.keyboard.press('Escape');
  await expect.poll(() => picker.evaluate((element) => element.matches(':open'))).toBe(false);
  await picker.blur();
  await page.mouse.move(0, 0);
}

test.describe('CodeBlock with Picklist reference', () => {
  test('decorates grouped picker panels and initializes Client client.js', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, pickerFixture);
    const picker = block.locator('select');

    await expect(block).toHaveAttribute('data-languages', pickerFixture.options.join(', '));
    await expect(block.getByRole('tab')).toHaveText(pickerFixture.tabs);
    await expect(picker).toBeVisible();
    await expect(picker.locator('option')).toHaveText(pickerFixture.options);
    await expectSelectedPickerOption(picker, 'client.js');
    await expectCodePanels(block, pickerFixture.panels);
    await expectSelectedTab(block, 'Client');
    await expectPickerOptions(page, block, ['client.js', 'client.py']);
    await expectVisiblePanel(block, 0);
  });

  test('switches file choices and tab groups with the picker', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, pickerFixture);
    const picker = block.locator('select');

    await picker.selectOption({ label: 'client.py' });
    await expectSelectedTab(block, 'Client');
    await expectSelectedPickerOption(picker, 'client.py');
    await expectPickerOptions(page, block, ['client.js', 'client.py']);
    await expectVisiblePanel(block, 1);

    await block.getByRole('tab', { name: 'Server', exact: true }).click();
    await expectSelectedTab(block, 'Server');
    await expectSelectedPickerOption(picker, 'server.js');
    await expectPickerOptions(page, block, ['server.js', 'server.py']);
    await expectVisiblePanel(block, 2);

    await picker.selectOption({ label: 'server.py' });
    await expectSelectedTab(block, 'Server');
    await expectSelectedPickerOption(picker, 'server.py');
    await expectVisiblePanel(block, 3);
  });

  test('collapses and restores the selected code panel', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, pickerFixture);
    const picker = block.locator('select');

    await block.getByRole('tab', { name: 'Server', exact: true }).click();
    await picker.selectOption({ label: 'server.py' });
    await expectSelectedTab(block, 'Server');
    await expectSelectedPickerOption(picker, 'server.py');
    await expectVisiblePanel(block, 3);

    await block.getByRole('button', { name: 'Collapse code', exact: true }).click();
    await expect(block).toHaveClass(/(^|\s)collapsed(\s|$)/);
    await expect(block.getByRole('button', { name: 'Expand code', exact: true }))
      .toHaveAttribute('aria-expanded', 'false');
    await expectAllPanelsHidden(block);

    await block.getByRole('button', { name: 'Expand code', exact: true }).click();
    await expect(block).not.toHaveClass(/(^|\s)collapsed(\s|$)/);
    await expect(block.getByRole('button', { name: 'Collapse code', exact: true }))
      .toHaveAttribute('aria-expanded', 'true');
    await expectSelectedTab(block, 'Server');
    await expectSelectedPickerOption(picker, 'server.py');
    await expectVisiblePanel(block, 3);
  });

  test('matches Client and Server picker visuals', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, pickerFixture);
    const picker = block.locator('select');

    await expectSelectedTab(block, 'Client');
    await expectPickerOptions(page, block, ['client.js', 'client.py']);
    await expectVisiblePanel(block, 0);
    await hideNonComponentContent(page);
    await expect(block).toHaveScreenshot('codeblock-with-picklist-client.png');

    await block.getByRole('tab', { name: 'Server', exact: true }).click();
    await picker.selectOption({ label: 'server.py' });
    await expectSelectedTab(block, 'Server');
    await expectSelectedPickerOption(picker, 'server.py');
    await expectPickerOptions(page, block, ['server.js', 'server.py']);
    await expectVisiblePanel(block, 3);
    await page.mouse.move(0, 0);
    await expect(block).toHaveScreenshot('codeblock-with-picklist-server-python.png');
  });
});

test.describe('CodeBlock without Picklist reference', () => {
  test('decorates separate code tabs without exposing a picker', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, noPickerFixture);
    const picker = block.locator('select');

    await expect(block).not.toHaveAttribute('data-languages');
    await expect(block.getByRole('tab')).toHaveText(noPickerFixture.tabs);
    await expect(picker).toBeHidden();
    await expect(picker.locator('option')).toHaveText(noPickerFixture.options);
    await expectCodePanels(block, noPickerFixture.panels);
    await expectSelectedTab(block, 'index.html');
    await expectVisiblePanel(block, 0);
  });

  test('switches independent heading tabs without a picker', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, noPickerFixture);

    await block.getByRole('tab', { name: 'app.js', exact: true }).click();
    await expectSelectedTab(block, 'app.js');
    await expectVisiblePanel(block, 1);

    await block.getByRole('tab', { name: 'utils.js', exact: true }).click();
    await expectSelectedTab(block, 'utils.js');
    await expectVisiblePanel(block, 2);
  });

  test('matches tab-only and collapsed visuals', async ({ page }) => {
    const block = await openCodeBlockReferencePage(page, noPickerFixture);

    await expectSelectedTab(block, 'index.html');
    await expectVisiblePanel(block, 0);
    await hideNonComponentContent(page);
    await expect(block).toHaveScreenshot('codeblock-without-picklist-index.png');

    await block.getByRole('tab', { name: 'app.js', exact: true }).click();
    await expectSelectedTab(block, 'app.js');
    await expectVisiblePanel(block, 1);
    await block.getByRole('button', { name: 'Collapse code', exact: true }).click();
    await expect(block).toHaveClass(/(^|\s)collapsed(\s|$)/);
    await expectAllPanelsHidden(block);
    await page.mouse.move(0, 0);
    await expect(block).toHaveScreenshot('codeblock-collapsed.png');
  });
});
