import { expect, test } from '@playwright/test';
import { openDevDocsReferencePage } from '../visual-test-utils.mjs';

const pages = [
  {
    name: 'Support',
    path: '/developer-distribution/creative-cloud/docs/support/',
    heading: 'Adobe Developer Distribution Support',
    sections: [
      { title: 'Frequently Asked Questions', id: 'frequently-asked-questions' },
      { title: 'Developer Forums', id: 'developer-forums' },
      { title: 'Bugs and Feature Requests', id: 'bugs-and-feature-requests' },
      { title: 'Formal Support Requests', id: 'formal-support-requests' },
    ],
  },
  {
    name: 'Guide',
    path: '/developer-distribution/creative-cloud/docs/guides/',
    heading: 'Adobe Developer Distribution',
    sections: [
      { title: 'Overview', id: 'overview' },
      {
        title: 'Developer Distribution New Listing Use Cases for UXP Plugin Listings',
        id: 'developer-distribution-new-listing-use-cases-for-uxp-plugin-listings',
      },
      { title: 'Access the Developer Distribution Portal', id: 'access-the-developer-distribution-portal' },
      { title: 'Next Steps', id: 'next-steps' },
    ],
  },
];

function getSection(page, { title, id }) {
  const heading = page.getByRole('heading', { level: 2, name: title, exact: true });
  const row = page.locator('main .heading-with-permalink').filter({ has: heading });
  const link = row.getByRole('link', { name: id, exact: true });
  return { heading, row, link };
}

async function tabToLink(page, link) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await link.evaluate((element) => document.activeElement === element)) return;
  }
  await expect(link, 'the permalink must be reachable using Tab').toBeFocused();
}

async function expectUnclippedFocus(link) {
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS('opacity', '1');
  await expect.poll(() => link.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(':focus-visible')
      && style.outlineStyle !== 'none'
      && parseFloat(style.outlineWidth) > 0;
  }), { message: 'keyboard focus must have a visible outline' }).toBe(true);

  await expect.poll(() => link.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const extent = Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset));
    const clippedBy = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      const left = bounds.left + parent.clientLeft;
      const top = bounds.top + parent.clientTop;
      const clips = (overflow) => ['hidden', 'clip', 'auto', 'scroll'].includes(overflow);
      if (clips(parentStyle.overflowX)
        && (rect.left - extent < left - 0.5
          || rect.right + extent > left + parent.clientWidth + 0.5)) {
        clippedBy.push(`${parent.tagName}.${parent.className}: horizontal`);
      }
      if (clips(parentStyle.overflowY)
        && (rect.top - extent < top - 0.5
          || rect.bottom + extent > top + parent.clientHeight + 0.5)) {
        clippedBy.push(`${parent.tagName}.${parent.className}: vertical`);
      }
    }
    return clippedBy;
  }), { message: 'ancestors must not crop the permalink focus outline' }).toEqual([]);
}

for (const example of pages) {
  test.describe(`${example.name} heading permalinks`, () => {
    test.beforeEach(async ({ page }) => {
      await openDevDocsReferencePage(page, example);
      await expect(page.locator('main .heading2.block[data-block-status="loaded"]'))
        .toHaveCount(example.sections.length);
      await expect(page.locator('main .heading-with-permalink'))
        .toHaveCount(example.sections.length);
    });

    test('exposes section headings and permalink links independently', async ({ page }) => {
      for (const section of example.sections) {
        const { heading, row, link } = getSection(page, section);
        await expect(heading).toHaveAttribute('id', section.id);
        await expect(heading.locator('a.anchor-link')).toHaveCount(0);
        await expect(link).toHaveAttribute('href', `#${section.id}`);
        await expect(row).toMatchAriaSnapshot(`
          - heading "${section.title}" [level=2]
          - link "${section.id}":
            - /url: "#${section.id}"
        `);
      }
    });

    test('reveals each icon on heading hover without changing the default state', async ({ page }) => {
      await page.mouse.move(0, 0);
      for (const section of example.sections) {
        const { row, link } = getSection(page, section);
        await expect(link).toHaveCSS('opacity', '0');
        await row.hover();
        await expect(link).toHaveCSS('opacity', '1');
        await page.mouse.move(0, 0);
        await expect(link).toHaveCSS('opacity', '0');
      }
    });

    for (const mode of [
      { name: 'desktop', width: 1280, forcedColors: 'none' },
      { name: 'mobile', width: 320, forcedColors: 'none' },
      { name: 'mobile forced colours', width: 320, forcedColors: 'active' },
    ]) {
      test(`keeps keyboard focus visible and unclipped on ${mode.name}`, async ({ page }) => {
        await page.setViewportSize({ width: mode.width, height: 900 });
        await page.emulateMedia({ forcedColors: mode.forcedColors });
        await page.mouse.move(0, 0);
        // delayed.js adds speculation rules after attaching the focus handlers.
        await expect(page.locator('script[type="speculationrules"]')).toBeAttached();
        for (const section of example.sections) {
          const { link } = getSection(page, section);
          await tabToLink(page, link);
          await expectUnclippedFocus(link);
        }
      });
    }

    test('activates the fragment with Enter and keeps its heading below the fixed header', async ({ page }) => {
      for (const section of example.sections) {
        const { heading, link } = getSection(page, section);
        await tabToLink(page, link);
        await page.keyboard.press('Enter');
        await expect.poll(() => new URL(page.url()).hash).toBe(`#${section.id}`);
        await expect.poll(() => heading.evaluate((element) => {
          const header = document.querySelector('header.global-nav-header');
          if (!header) throw new Error('Global header is missing');
          const bounds = element.getBoundingClientRect();
          return bounds.top >= Math.max(0, header.getBoundingClientRect().bottom) - 1
            && bounds.bottom <= window.innerHeight;
        }), { message: 'the fragment heading must remain visible below the fixed header' }).toBe(true);
      }
    });

    for (const width of [1280, 768, 375, 320]) {
      test(`fits heading text and icons within their rows at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        for (const section of example.sections) {
          const { row } = getSection(page, section);
          await expect.poll(() => row.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const heading = element.querySelector('h2');
            const link = element.querySelector('a.anchor-link');
            const range = document.createRange();
            range.selectNodeContents(heading);
            const content = [...range.getClientRects(), link.getBoundingClientRect()];
            return bounds.width > 0 && bounds.height > 0
              && content.every((rect) => rect.left >= bounds.left - 0.5
                && rect.right <= bounds.right + 0.5
                && rect.top >= bounds.top - 0.5
                && rect.bottom <= bounds.bottom + 0.5);
          }), { message: `${section.title} must wrap without overflowing its row` }).toBe(true);
        }
      });
    }
  });
}
