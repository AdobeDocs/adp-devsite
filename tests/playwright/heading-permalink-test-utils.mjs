import { expect } from '@playwright/test';
import { openDevDocsReferencePage } from './visual-test-utils.mjs';

function getSection(page, { title, id }, level) {
  const heading = page.getByRole('heading', { level, name: title, exact: true });
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

async function addHeadingFixtures(page, level, sections) {
  // Insert fixture content only; production helpers create and load the blocks.
  await page.evaluate(async ({ headingLevel, examples }) => {
    const { buildBlock, decorateBlock, loadBlock } = await import('/hlx_statics/scripts/lib-helix.js');
    const { focusRing } = await import('/hlx_statics/scripts/lib-adobeio.js');
    const firstHeading = document.querySelector('main .heading2-wrapper');
    if (!firstHeading) throw new Error('Guide heading wrapper is missing');
    for (const example of examples) {
      const wrapper = document.createElement('div');
      const block = buildBlock(`heading${headingLevel}`,
        `<h${headingLevel} id="${example.id}">${example.content}</h${headingLevel}>`);
      wrapper.appendChild(block);
      firstHeading.before(wrapper);
      decorateBlock(block);
      await loadBlock(block);
      // These blocks were added after page initialization.
      focusRing(wrapper);
    }
  }, { headingLevel: level, examples: sections });
  await page.evaluate(() => document.fonts.ready);
}

export function createHeadingPermalinkCases(example) {
  const { level = 2, fixture = false } = example;
  const beforeEach = async ({ page }) => {
    await openDevDocsReferencePage(page, example);
    await expect(page.locator('main .heading2.block[data-block-status="loaded"]'))
      .toHaveCount(fixture ? 4 : example.sections.length);
    if (fixture) await addHeadingFixtures(page, level, example.sections);
    await expect(page.locator(`main .heading${level}.block[data-block-status="loaded"]`))
      .toHaveCount(example.sections.length);
    if (!fixture) {
      await expect(page.locator('main .heading-with-permalink'))
        .toHaveCount(example.sections.length);
    }
  };
  const cases = [
    {
      name: 'exposes section headings and permalink links independently',
      run: async ({ page }) => {
        for (const section of example.sections) {
          const { heading, row, link } = getSection(page, section, level);
          await expect(heading).toHaveAttribute('id', section.id);
          await expect(heading.locator('a.anchor-link')).toHaveCount(0);
          await expect(link).toHaveAttribute('href', `#${section.id}`);
          await expect(row).toMatchAriaSnapshot(`
          - heading "${section.title}" [level=${level}]
          - link "${section.id}":
            - /url: "#${section.id}"
        `);
          if (fixture) {
            const block = page.locator(`main .heading${level}.block`).filter({ has: heading });
            await expect(block.locator('hr')).toHaveCount(0);
            await expect(block.locator(':scope > div > div > div[aria-hidden="true"]'))
              .toHaveAttribute('id', section.id);
            if (section.formatted) await expect(heading.locator('strong')).toHaveText('formatted text');
          }
        }
      },
    },
    {
      name: 'reveals each icon on heading hover without changing the default state',
      run: async ({ page }) => {
        await page.mouse.move(0, 0);
        for (const section of example.sections) {
          const { row, link } = getSection(page, section, level);
          await expect(link).toHaveCSS('opacity', '0');
          await row.hover();
          await expect(link).toHaveCSS('opacity', '1');
          await page.mouse.move(0, 0);
          await expect(link).toHaveCSS('opacity', '0');
        }
      },
    },
  ];

  cases.push({
    name: 'keeps keyboard focus visible and unclipped at 320px',
    run: async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.mouse.move(0, 0);
      // delayed.js adds speculation rules after attaching the focus handlers.
      await expect(page.locator('script[type="speculationrules"]')).toBeAttached();
      for (const section of example.sections) {
        const { link } = getSection(page, section, level);
        await tabToLink(page, link);
        await expectUnclippedFocus(link);
      }
    },
  });

  cases.push({
    name: 'activates the fragment with Enter and keeps its heading below the fixed header',
    run: async ({ page }) => {
      for (const section of example.sections) {
        const { heading, link } = getSection(page, section, level);
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
    },
  });

  cases.push({
    name: 'fits heading text and icons within their rows at 320px',
    run: async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      for (const section of example.sections) {
        const { heading, row } = getSection(page, section, level);
        await expect.poll(() => row.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const title = element.querySelector('h2,h3,h4,h5,h6');
          const link = element.querySelector('a.anchor-link');
          const range = document.createRange();
          range.selectNodeContents(title);
          const content = [...range.getClientRects(), link.getBoundingClientRect()];
          return bounds.width > 0 && bounds.height > 0
            && content.every((rect) => rect.left >= bounds.left - 0.5
              && rect.right <= bounds.right + 0.5
              && rect.top >= bounds.top - 0.5
              && rect.bottom <= bounds.bottom + 0.5);
        }), { message: `${section.title} must wrap without overflowing its row` }).toBe(true);
        if (fixture) {
          await expect(row).toHaveCSS('margin-top', level === 3 ? '28px' : '32px');
          await expect(row).toHaveCSS('margin-bottom', level === 3 ? '4px' : '0px');
          await expect(row.locator(':scope > span')).toHaveCSS('margin-left', '4px');
          await expect(heading).toHaveCSS('font-size', `${level === 3 ? 18 : level === 4 ? 16 : 14}px`);
          await expect(heading).toHaveCSS('margin-top', '0px');
          await expect(heading).toHaveCSS('margin-bottom', '0px');
          await expect.poll(() => heading.evaluate((element) => {
            const style = getComputedStyle(element);
            const parent = getComputedStyle(element.parentElement);
            return style.font === parent.font && style.color === parent.color;
          })).toBe(true);
          if (level === 3) await expect(heading).toHaveCSS('color', 'rgb(0, 0, 0)');
          if (section.formatted) {
            await expect.poll(() => heading.evaluate((element) => {
              const range = document.createRange();
              range.selectNodeContents(element);
              return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
            }), { message: 'the long fixture must actually wrap onto multiple lines' }).toBeGreaterThan(1);
          }
        }
      }
    },
  });
  return { beforeEach, cases };
}

export function createHeadingFixtureCases(level) {
  const title = `Heading ${level} longer formatted text that wraps across multiple lines on narrow screens while keeping the permalink beside its title`;
  return createHeadingPermalinkCases({
    name: `H${level} browser fixtures`,
    path: '/developer-distribution/creative-cloud/docs/guides/',
    heading: 'Adobe Developer Distribution',
    level,
    fixture: true,
    sections: [
      {
        title: `Heading ${level} overview`,
        id: `heading-${level}-fixture-overview`,
        content: `Heading ${level} overview`,
      },
      {
        title,
        id: `heading-${level}-fixture-long-title`,
        content: title.replace('formatted text', '<strong>formatted text</strong>'),
        formatted: true,
      },
    ],
  });
}
