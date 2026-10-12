import { expect, test } from '@playwright/test';

const supportPath = '/developer-distribution/creative-cloud/docs/support/';
const docsPath = '/dev-docs-reference/blocks/cards/';

async function openNavigationPage(page, path) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, 'the page should return an HTTP response').not.toBeNull();
  expect(response.ok(), `page returned ${response.status()}`).toBeTruthy();
  await expect(page.locator('header .menu-icon')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.side-nav.block')).toHaveAttribute('data-block-status', 'loaded');
  await expect(page.locator('.side-nav-menu-section a').first()).toHaveText('Products');
}

async function expectDrawerInert(page, inert) {
  await expect.poll(() => page.locator('.side-nav').evaluate((element) => element.inert))
    .toBe(inert);
}

async function exposedDrawerNames(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const byId = new Map(nodes.map((node) => [node.nodeId, node]));
    const inDrawer = (node) => {
      const parent = byId.get(node.parentId);
      if (!parent) return false;
      return (parent.role?.value === 'navigation' && parent.name?.value === 'Primary')
        || inDrawer(parent);
    };
    return nodes.filter((node) => !node.ignored
      && inDrawer(node)
      && ['Products', 'Global Navigation'].includes(node.name?.value))
      .map((node) => node.name.value);
  } finally {
    await session.detach();
  }
}

async function expectNextTabOutsideDrawer(page) {
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => (
    Boolean(document.activeElement.closest('.side-nav'))
  ))).toBe(false);
}

test.describe('Header collapsed mobile navigation', () => {
  [320, 375, 768].forEach((width) => {
    test(`excludes the initial closed drawer from accessibility and Tab at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openNavigationPage(page, supportPath);
      const toggle = page.locator('header .menu-icon');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expectDrawerInert(page, true);
      await expect.poll(() => exposedDrawerNames(page)).toEqual([]);

      const createdInert = await page.evaluate(async () => {
        const { buildSideNav } = await import(
          new URL('/hlx_statics/scripts/lib-adobeio.js', window.location.href).href
        );
        const main = document.createElement('main');
        buildSideNav(main);
        return main.querySelector('.side-nav').inert;
      });
      expect(createdInert, 'new drawers must be inert before decoration').toBe(true);

      await page.locator('.nav-sign-in > button').focus();
      await expectNextTabOutsideDrawer(page);
      await expectNextTabOutsideDrawer(page);
      await expectNextTabOutsideDrawer(page);
      await expectNextTabOutsideDrawer(page);
      await expectNextTabOutsideDrawer(page);
    });
  });

  test('preserves keyboard open, close, reopen and focus restoration', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await openNavigationPage(page, supportPath);
    const toggle = page.locator('header .menu-icon');
    const products = page.locator('.side-nav-menu-section a').first();

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.side-nav')).toHaveClass(/\bis-visible\b/);
    await expectDrawerInert(page, false);
    await expect.poll(() => exposedDrawerNames(page)).toContain('Products');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.locator('.nav-sign-in > button').focus();
    await page.keyboard.press('Tab');
    await expect(products).toBeFocused();

    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.side-nav')).not.toHaveClass(/\bis-visible\b/);
    await expectDrawerInert(page, true);
    await expect.poll(() => exposedDrawerNames(page)).toEqual([]);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Enter');
    await expectDrawerInert(page, false);
    await products.focus();
    await expect(products).toBeFocused();
    await page.locator('header .menu-btn').evaluate((checkbox) => {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
    });
    await expectDrawerInert(page, true);
    await expect(toggle).toBeFocused();
  });

  test('preserves desktop documentation navigation across breakpoint changes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openNavigationPage(page, docsPath);
    const tocLink = page.locator('.side-nav-subpages-section a:visible').first();
    const toggle = page.locator('header .menu-icon');
    await expectDrawerInert(page, false);
    await expect(tocLink).toBeVisible();
    await tocLink.focus();
    await expect(tocLink).toBeFocused();

    await page.setViewportSize({ width: 768, height: 900 });
    await expectDrawerInert(page, true);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect.poll(() => exposedDrawerNames(page)).toEqual([]);

    await page.keyboard.press('Enter');
    await expectDrawerInert(page, false);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.setViewportSize({ width: 769, height: 900 });
    await expectDrawerInert(page, false);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.side-nav')).not.toHaveClass(/\bis-visible\b/);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    await expect(tocLink).toBeVisible();
    await tocLink.focus();
    await expect(tocLink).toBeFocused();

    await page.setViewportSize({ width: 375, height: 900 });
    await expectDrawerInert(page, true);
    await expect(toggle).toBeFocused();
  });
});
