import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/resources/';
const resources = [
  {
    name: 'Quick start guide',
    href: `${path}getting-started/`,
    external: false,
  },
  {
    name: 'Endpoint guides',
    href: `${path}endpoints/`,
    external: false,
  },
  {
    name: 'API reference',
    href: 'https://example.com/api-reference',
    external: true,
  },
  {
    name: 'GitHub repository',
    href: 'https://github.com/example/repo',
    external: true,
  },
];

async function openResourcesPage(page) {
  await openDevDocsReferencePage(page, { path, heading: 'Resources Block' });
  await expect(page.locator('.resources.block')).toHaveCount(1);

  // Loading the block precedes the asynchronous DevDocs aside setup. Wait for
  // relocation too, using attachment rather than visibility on narrow screens.
  const block = page.locator('main > .aside-wrapper > .aside > .resources-wrapper > .resources.block');
  await expect(block).toHaveAttribute('data-block-status', 'loaded');

  return block;
}

async function expectIntactResources(block) {
  await expect(block.locator('a')).toHaveText(resources.map((resource) => resource.name));
  await expect(block.locator('.external-icon')).toHaveCount(2);
}

async function expectHiddenResources(block) {
  await expect(block).toBeHidden();
  await expectIntactResources(block);
  await expect(block.getByRole('link')).toHaveCount(0);

  for (let index = 0; index < resources.length; index += 1) {
    const link = block.locator('a').nth(index);
    await link.focus();
    await expect(link).not.toBeFocused();
  }
}

// Only destination documents are controlled. The reference page, block code,
// shared link decoration, and DevDocs layout all run normally.
async function mockDestination(context, url) {
  await context.route(url, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html><head><title>Resource destination</title></head><body><h1>Resource destination</h1></body></html>',
  }));
}

test.describe('Resources DevDocs reference', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('decorates the authored resources and moves them above On This Page in the aside', async ({ page }) => {
    const block = await openResourcesPage(page);
    const wrapper = block.locator('..');
    const onThisPage = page.locator('.aside > .onthispage-wrapper');

    await expect(block.getByRole('heading', { level: 4, name: 'Resources', exact: true })).toBeVisible();
    await expect(block).toHaveAttribute('data-slots', 'heading, links');
    await expect(block).toHaveAttribute('daa-lh', 'resources');
    await expect(block.locator('pre, code')).toHaveCount(0);
    await expect(block.getByRole('list')).toHaveCount(1);
    await expect(block.getByRole('listitem')).toHaveText(resources.map((resource) => resource.name));
    await expectIntactResources(block);

    for (const resource of resources) {
      const item = block.getByRole('listitem').filter({
        has: page.getByRole('link', { name: resource.name, exact: true }),
      });
      const link = item.getByRole('link', { name: resource.name, exact: true });
      const icon = item.locator('.external-icon');

      await expect(item).toHaveCount(1);

      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(resource.name);
      await expect(link).toHaveAttribute('href', resource.href);
      await expect(link).toHaveClass(/(^|\s)spectrum-Link(\s|$)/);
      await expect(link).toHaveClass(/(^|\s)spectrum-Link--quiet(\s|$)/);
      await expect(icon).toHaveCount(resource.external ? 1 : 0);
      if (resource.external) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /(^|\s)noopener(\s|$)/);
        await expect(link).toHaveAttribute('rel', /(^|\s)noreferrer(\s|$)/);
        await expect(icon).toBeVisible();
        await expect(icon.locator('svg')).toHaveAttribute('aria-hidden', 'true');
        await expect(icon.locator('svg')).toHaveAttribute('focusable', 'false');
      } else {
        await expect(link).not.toHaveAttribute('target', '_blank');
      }
    }
    await expect(block.getByRole('img')).toHaveCount(0);

    await expect(page.locator('main .resources-wrapper')).toHaveCount(1);
    await expect(page.locator('.grid-main-area .resources-wrapper')).toHaveCount(0);
    await expect(page.locator('.aside > .resources-wrapper ~ .onthispage-wrapper')).toHaveCount(1);
    await expect(onThisPage.getByRole('heading', { name: 'ON THIS PAGE', exact: true })).toBeVisible();
    await expect(onThisPage.getByRole('link', { name: 'Syntax', exact: true })).toBeVisible();
    await expect(onThisPage.getByRole('link', { name: 'Parameters', exact: true })).toBeVisible();

    const [resourcesBox, contentBox, onThisPageBox] = await Promise.all([
      wrapper.boundingBox(),
      page.locator('.grid-main-area').boundingBox(),
      onThisPage.boundingBox(),
    ]);
    if (!resourcesBox || !contentBox || !onThisPageBox) {
      throw new Error('Resources, page content, and On This Page must have visible bounds');
    }
    expect(resourcesBox.x).toBeGreaterThanOrEqual(contentBox.x + contentBox.width - 1);
    expect(resourcesBox.y + resourcesBox.height).toBeLessThanOrEqual(onThisPageBox.y + 1);
  });

  test('follows an internal resource in the same tab', async ({ page, context }) => {
    const block = await openResourcesPage(page);
    const resource = resources[0];
    const destination = new URL(resource.href, page.url()).href;
    await mockDestination(context, destination);

    await Promise.all([
      page.waitForURL(destination),
      block.getByRole('link', { name: resource.name, exact: true }).click(),
    ]);

    await expect(page).toHaveURL(destination);
    await expect(page.getByRole('heading', { name: 'Resource destination', exact: true })).toBeVisible();
    expect(context.pages()).toEqual([page]);
  });

  test('tabs through resource links without icon stops and opens external links safely', async ({ page, context }) => {
    const block = await openResourcesPage(page);
    const originalUrl = page.url();

    await block.getByRole('link', { name: resources[0].name, exact: true }).focus();
    for (let index = 0; index < resources.length; index += 1) {
      if (index > 0) await page.keyboard.press('Tab');
      await expect(block.getByRole('link', { name: resources[index].name, exact: true })).toBeFocused();
    }
    // The final icon must not become an extra stop before On This Page.
    await page.keyboard.press('Tab');
    await expect(page.locator('.onthispage-wrapper').getByRole('link', {
      name: 'Syntax',
      exact: true,
    })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(block.getByRole('link', { name: resources[3].name, exact: true })).toBeFocused();

    // Activate the focused GitHub link with Enter, then the API link by mouse.
    // Context routing also intercepts a popup's initial navigation request.
    const externalResources = resources.filter((resource) => resource.external).reverse();
    for (const [index, resource] of externalResources.entries()) {
      await mockDestination(context, resource.href);
      const popupPromise = page.waitForEvent('popup');
      if (index === 0) {
        await page.keyboard.press('Enter');
      } else {
        await block.getByRole('link', { name: resource.name, exact: true }).click();
      }
      const popup = await popupPromise;
      try {
        await expect(popup).toHaveURL(resource.href);
        await expect(popup.getByRole('heading', { name: 'Resource destination', exact: true })).toBeVisible();
        expect(await popup.evaluate(() => window.opener === null)).toBe(true);
        await expect(page).toHaveURL(originalUrl);
        await expectIntactResources(block);
      } finally {
        await popup.close();
      }
    }
    expect(context.pages()).toEqual([page]);
  });

  for (const initialWidth of [1280, 390]) {
    test(`respects the aside visibility breakpoint when loaded at ${initialWidth}px`, async ({ page }) => {
      await page.setViewportSize({ width: initialWidth, height: 900 });
      const block = await openResourcesPage(page);
      const wrapper = block.locator('..');

      if (initialWidth === 390) {
        await expectHiddenResources(block);
      } else {
        await expect(block).toBeVisible();
      }

      await page.setViewportSize({ width: 1229, height: 900 });
      await expect(block).toBeVisible();
      await expectIntactResources(block);
      for (const width of [1228, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator('.aside-wrapper')).toBeHidden();
        await expectHiddenResources(block);
      }

      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(wrapper).toBeVisible();
      await expectIntactResources(block);
      await expect(page.locator('main .resources-wrapper')).toHaveCount(1);
      await expect(page.locator('.grid-main-area .resources-wrapper')).toHaveCount(0);
    });
  }

  test('matches the desktop resources visual', async ({ page }) => {
    const block = await openResourcesPage(page);

    await expect(block.getByRole('heading', { name: 'Resources', exact: true })).toBeVisible();
    await expectIntactResources(block);
    await hideNonComponentContent(page);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await expect(block.locator('..')).toHaveScreenshot('resources-desktop.png');
  });
});
