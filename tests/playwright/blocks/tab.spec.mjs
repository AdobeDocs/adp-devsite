import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
  waitForPrismHighlighting,
} from '../visual-test-utils.mjs';

const devDocsPath = '/dev-docs-reference/blocks/tab/';
const devBizPath = '/tools/sidekick/blocks/tab';
const devDocsExamples = [
  {
    name: 'horizontal request and response code',
    orientation: 'horizontal',
    slots: 'heading, content',
    repeat: 2,
    tabs: ['Request', 'Response'],
    content: ['createCustomerV2', '"email": "bobloblaw@example.com"'],
    snapshot: 'tab-devdocs-horizontal.png',
  },
  {
    name: 'vertical tabs with an image',
    orientation: 'vertical',
    slots: 'heading, image, content',
    repeat: 3,
    tabs: ['Tab 1', 'Tab 2', 'Tab 3'],
    content: ['content tab 1', 'content tab 2', 'content tab 3'],
    snapshot: 'tab-devdocs-vertical.png',
  },
];

// The Sidekick fixture's authored order is the positional contract for these
// variants. Each entry also has a semantic identity checked before .nth() is
// used by a test.
const devBizVariants = [
  {
    name: 'default horizontal tabs',
    metadataName: 'Tab',
    index: 0,
    orientation: 'horizontal',
    activeText: 'Lorem ipsum dolor sit amet consectetur adipiscing elit.',
    snapshot: 'tab-devbiz-horizontal.png',
  },
  {
    name: 'navy horizontal tabs',
    metadataName: 'Tab with navy background',
    index: 1,
    orientation: 'horizontal',
    className: 'background-color-navy',
    activeText: 'Lorem ipsum dolor sit amet consectetur adipiscing elit.',
    snapshot: 'tab-devbiz-navy.png',
  },
  {
    name: 'vertical tabs',
    metadataName: 'Tab with vertical orientation',
    index: 2,
    orientation: 'vertical',
    className: 'vertical',
    activeText: 'Lorem ipsum dolor sit amet consectetur adipiscing elit.',
    snapshot: 'tab-devbiz-vertical.png',
  },
  {
    name: 'vertical nested code tabs',
    metadataName: 'Tab with code block',
    index: 3,
    orientation: 'vertical',
    className: 'background-color-navy',
    code: true,
    lineNumbers: true,
    snapshot: 'tab-devbiz-code.png',
  },
  {
    name: 'vertical nested code tabs without line numbers',
    metadataName: 'Tab with code block without line numbers',
    index: 4,
    orientation: 'vertical',
    className: 'background-color-navy',
    code: true,
    lineNumbers: false,
    snapshot: 'tab-devbiz-code-no-line-numbers.png',
  },
  {
    name: 'three-card panels',
    metadataName: 'Tab with three-card layout',
    index: 5,
    orientation: 'horizontal',
    cardColumns: 3,
    activeImageCount: 7,
    ctaClass: 'spectrum-Button--outline',
    snapshot: 'tab-devbiz-card-panels-three.png',
  },
  {
    name: 'content and image card panels',
    metadataName: 'Tab with content and image cards',
    index: 6,
    orientation: 'horizontal',
    cardColumns: 2,
    activeImageCount: 1,
    ctaClass: 'spectrum-Button--fill',
    snapshot: 'tab-devbiz-card-panels-two.png',
  },
  {
    name: 'single card panels',
    metadataName: 'Tab with single card',
    index: 7,
    orientation: 'horizontal',
    cardColumns: 1,
    activeImageCount: 0,
    ctaClass: 'spectrum-Button--fill',
    snapshot: 'tab-devbiz-card-panels-one.png',
  },
];

function wrapperOf(block) {
  return block.locator('..');
}

function devDocsBlock(page, example) {
  return page.locator(`main .tab.block[data-orientation="${example.orientation}"]`);
}

function devBizBlockAt(page, variant) {
  return page.locator('main .tab.block').nth(variant.index);
}

function metadataFor(block) {
  return wrapperOf(block).locator('xpath=following-sibling::*[1]');
}

function tabButtonAt(block, index) {
  return block.locator(`.tab-button[data-tab="tab${index + 1}"]`);
}

function tabPanelAt(block, index) {
  return block.locator(`:scope > .content-wrapper > [data-tab-content="tab${index + 1}"]`);
}

async function expectSelectedTab(block, index) {
  const panels = block.locator(':scope > .content-wrapper > .tab-content');
  const selectedButton = tabButtonAt(block, index);
  const selectedPanel = tabPanelAt(block, index);

  await expect(block.locator('.tab-button.active')).toHaveCount(1);
  await expect(selectedButton).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(selectedPanel).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(selectedPanel).toBeVisible();

  for (let panelIndex = 0; panelIndex < await panels.count(); panelIndex += 1) {
    if (panelIndex !== index) await expect(panels.nth(panelIndex)).toBeHidden();
  }
}

async function expectSelectedSubTab(panel, index) {
  const buttons = panel.locator(':scope > .sub-tabs-wrapper > .sub-tab-button');
  const panels = panel.locator(':scope > .sub-content-wrapper > .sub-tab-content');

  await expect(panel.locator('.sub-tab-button.active')).toHaveCount(1);
  await expect(buttons.nth(index)).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(panels.nth(index)).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(panels.nth(index)).toBeVisible();
  for (let panelIndex = 0; panelIndex < await panels.count(); panelIndex += 1) {
    if (panelIndex !== index) await expect(panels.nth(panelIndex)).toBeHidden();
  }
}

async function waitForVisibleImages(target) {
  await target.scrollIntoViewIfNeeded();
  const images = target.locator('img:visible');
  const expectedCount = await images.count();

  await expect.poll(() => images.evaluateAll((elements, count) => (
    elements.length === count && elements.every((image) => (
      image.complete && image.naturalWidth > 0
    ))
  ), expectedCount)).toBe(true);
}

async function expectSnapshot(page, block, name) {
  const wrapper = wrapperOf(block);

  await waitForVisibleImages(wrapper);
  await waitForPrismHighlighting(page);
  await page.evaluate(() => document.fonts.ready);
  await hideNonComponentContent(page);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(0, 0);
  await expect(wrapper).toHaveScreenshot(name);
}

async function openDevDocsTabPage(page) {
  await openDevDocsReferencePage(page, {
    path: devDocsPath,
    heading: 'Tab Block',
  });

  const blocks = page.locator('main .tab.block');
  await expect(blocks).toHaveCount(devDocsExamples.length);
  await expect(page.locator('main .tab.block[data-block-status="loaded"]'))
    .toHaveCount(devDocsExamples.length);

  for (const example of devDocsExamples) {
    const block = devDocsBlock(page, example);

    await expect(block).toHaveCount(1);
    await expect(block).toHaveAttribute('data-slots', example.slots);
    await expect(block).toHaveAttribute('data-repeat', String(example.repeat));
    await expect(block).toHaveAttribute('daa-lh', 'tab');
    await expect(block).toHaveClass(new RegExp(`(^|\\s)${example.orientation}(\\s|$)`));
    await expect(block.locator('.tab-button')).toHaveCount(example.tabs.length);
    await expect(block.locator('.tab-button')).toHaveText(example.tabs);
    await expect(block.locator('.tab-content')).toHaveCount(example.repeat);
  }
}

async function openDevBizTabPage(page) {
  const response = await page.goto(devBizPath, { waitUntil: 'domcontentloaded' });
  expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

  const blocks = page.locator('main .tab.block');
  await expect(blocks).toHaveCount(devBizVariants.length);
  await expect(page.locator('main .tab.block[data-block-status="loaded"]'))
    .toHaveCount(devBizVariants.length);

  // Assert the authored identity of every index before scenarios select a
  // DevBiz variant by position.
  for (const variant of devBizVariants) {
    const block = devBizBlockAt(page, variant);
    const metadata = metadataFor(block);

    await expect(block).toHaveAttribute('data-block-status', 'loaded');
    await expect(block).toHaveClass(new RegExp(`(^|\\s)${variant.orientation}(\\s|$)`));
    await expect(block.locator('.tab-button')).toHaveCount(3);
    await expect(block.locator('.tab-content')).toHaveCount(3);
    await expect(metadata).toHaveClass(/(^|\s)library-metadata-wrapper(\s|$)/);
    await expect(metadata.getByText(variant.metadataName, { exact: true })).toHaveCount(1);

    if (variant.className) {
      await expect(block).toHaveClass(new RegExp(`(^|\\s)${variant.className}(\\s|$)`));
    }
    if (variant.activeText) {
      await expect(tabPanelAt(block, 0)).toContainText(variant.activeText);
    }
    if (variant.code) {
      await expect(block.locator('.sub-tab-button')).toHaveCount(5);
      await expect(block.locator('pre[class*="language-"]')).toHaveCount(5);
      const expectedClass = variant.lineNumbers ? 'line-numbers' : 'no-line-numbers';
      await expect(block.locator(`pre.${expectedClass}`)).toHaveCount(5);
    }
    if (variant.cardColumns) {
      const activeCard = tabPanelAt(block, 0).locator('.card-panels-card');
      await expect(activeCard).toHaveCount(1);
      await expect(activeCard).toHaveCSS(
        '--card-panels-card-cols',
        String(variant.cardColumns),
      );
      await expect(activeCard.locator(':scope > *')).toHaveCount(variant.cardColumns);
      await expect(activeCard.locator('img')).toHaveCount(variant.activeImageCount);
    }
  }

  await page.evaluate(() => document.fonts.ready);
}

// Keep requests to this externally hosted fixture ordered to avoid AEM rate
// limiting. The tests still begin with fresh, independent pages.
test.describe.configure({ mode: 'default' });

test.describe('Tab DevDocs reference', () => {
  test.beforeEach(async ({ page }) => openDevDocsTabPage(page));

  test('decorates and switches horizontal request and response code panels', async ({ page }) => {
    const example = devDocsExamples[0];
    const block = devDocsBlock(page, example);

    await expect(block.locator('.code-toolbar')).toHaveCount(2);
    await expect(tabPanelAt(block, 0).locator('pre')).toHaveClass(/\blanguage-graphql\b/);
    await expect(tabPanelAt(block, 1).locator('pre')).toHaveClass(/\blanguage-json\b/);
    await expectSelectedTab(block, 0);
    await expect(tabPanelAt(block, 0)).toContainText(example.content[0]);

    await block.getByRole('button', { name: 'Response', exact: true }).click();
    await expectSelectedTab(block, 1);
    await expect(tabPanelAt(block, 1)).toContainText(example.content[1]);
  });

  test('decorates and switches vertical icon tabs', async ({ page }) => {
    const example = devDocsExamples[1];
    const block = devDocsBlock(page, example);
    const icons = block.locator('.tab-icon img');

    await expect(block.locator('.tabs-wrapper')).toHaveCSS('flex-direction', 'column');
    await expect(icons).toHaveCount(3);
    for (let index = 0; index < example.tabs.length; index += 1) {
      await expect(icons.nth(index)).toHaveAttribute('alt', 'icon');
      await expect(icons.nth(index)).toHaveCSS('width', '36px');
      await expect(icons.nth(index)).toHaveCSS('height', '36px');
    }
    await waitForVisibleImages(wrapperOf(block));
    await expectSelectedTab(block, 0);

    await block.getByRole('button', { name: /Tab 2$/ }).click();
    await expectSelectedTab(block, 1);
    await expect(tabPanelAt(block, 1)).toContainText(example.content[1]);
  });

  test('switches tabs in one block without changing the other block', async ({ page }) => {
    const horizontal = devDocsBlock(page, devDocsExamples[0]);
    const vertical = devDocsBlock(page, devDocsExamples[1]);

    await horizontal.getByRole('button', { name: 'Response', exact: true }).click();
    await expectSelectedTab(horizontal, 1);
    await expectSelectedTab(vertical, 0);

    await vertical.getByRole('button', { name: /Tab 3$/ }).click();
    await expectSelectedTab(vertical, 2);
    await expectSelectedTab(horizontal, 1);
  });

  for (const example of devDocsExamples) {
    test(`matches the ${example.name} visual snapshot`, async ({ page }) => {
      const block = devDocsBlock(page, example);

      await expectSelectedTab(block, 0);
      await expectSnapshot(page, block, example.snapshot);
    });
  }
});

test.describe('Tab DevBiz reference', () => {
  test.beforeEach(async ({ page }) => openDevBizTabPage(page));

  for (const variant of devBizVariants.slice(0, 3)) {
    test(`switches ${variant.name} and keeps the content associated with each tab`, async ({ page }) => {
      const block = devBizBlockAt(page, variant);
      const tabs = block.locator('.tabs-wrapper');

      await expect(tabs).toHaveCSS(
        'flex-direction',
        variant.orientation === 'vertical' ? 'column' : 'row',
      );
      await expect(block.locator('.tab-icon img')).toHaveCount(3);
      await expectSelectedTab(block, 0);
      if (variant.className === 'background-color-navy') {
        await expect(wrapperOf(block)).toHaveCSS('background-color', 'rgb(15, 55, 95)');
      } else {
        await expect(wrapperOf(block)).toHaveCSS('background-color', 'rgb(245, 245, 245)');
      }

      await tabButtonAt(block, 1).click();
      await expectSelectedTab(block, 1);
      await expect(tabPanelAt(block, 1)).toContainText(
        'Tempus leo eu aenean sed diam urna tempor.',
      );
    });
  }

  for (const variant of devBizVariants.filter(({ code }) => code)) {
    test(`switches outer and nested ${variant.name}`, async ({ page }) => {
      const block = devBizBlockAt(page, variant);

      await expectSelectedTab(block, 0);
      await expectSelectedSubTab(tabPanelAt(block, 0), 0);
      await expect(tabPanelAt(block, 0).locator('.sub-tab-content.active pre'))
        .toHaveClass(/\blanguage-bash\b/);

      await tabButtonAt(block, 1).click();
      const secondPanel = tabPanelAt(block, 1);
      await expectSelectedTab(block, 1);
      await expectSelectedSubTab(secondPanel, 0);

      await secondPanel.getByRole('button', { name: 'Python', exact: true }).click();
      await expectSelectedSubTab(secondPanel, 1);
      await expect(secondPanel.locator('.sub-tab-content.active'))
        .toContainText('print(\'The sum of {0} and {1} is {2}\'.format(num1, num2, sum))');
      await expect(secondPanel.locator('.sub-tab-content.active pre'))
        .toHaveClass(/\blanguage-python\b/);
    });
  }

  for (const variant of devBizVariants.filter(({ cardColumns }) => cardColumns)) {
    test(`switches ${variant.name} and decorates the active card layout`, async ({ page }) => {
      const block = devBizBlockAt(page, variant);
      const firstPanel = tabPanelAt(block, 0);
      const firstCard = firstPanel.locator('.card-panels-card');
      const cta = firstCard.getByRole('link', { name: 'Learn more', exact: true });

      await expectSelectedTab(block, 0);
      await expect(firstCard.locator(':scope > *')).toHaveCount(variant.cardColumns);
      await expect(firstCard.getByRole('heading', { name: 'AI at Adobe.', exact: true }))
        .toBeVisible();
      await expect(firstCard.locator('img')).toHaveCount(variant.activeImageCount);
      await expect(cta).toHaveClass(new RegExp(`\\b${variant.ctaClass}\\b`));
      await expect(cta).toHaveAttribute('href', 'https://adobe.com');

      await tabButtonAt(block, 1).click();
      const secondCard = tabPanelAt(block, 1).locator('.card-panels-card');
      await expectSelectedTab(block, 1);
      await expect(secondCard.locator(':scope > *')).toHaveCount(variant.cardColumns);
      await expect(secondCard.getByRole('heading', {
        name: 'AI-powered content management and end-to-end workflows.',
        exact: true,
      })).toBeVisible();
    });
  }

  for (const variant of devBizVariants) {
    test(`matches the ${variant.name} visual snapshot`, async ({ page }) => {
      const block = devBizBlockAt(page, variant);

      await expectSelectedTab(block, 0);
      await expectSnapshot(page, block, variant.snapshot);
    });
  }
});
