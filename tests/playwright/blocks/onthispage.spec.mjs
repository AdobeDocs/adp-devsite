import { expect, test } from '@playwright/test';
import { hideNonComponentContent, openDevDocsReferencePage } from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/accordion/';
// The authored heading order is the fixture contract, not a copy of the
// implementation's heading selector (which would hide exclusion regressions).
const entries = [
  { name: 'Syntax', href: '#syntax', level: 2 },
  { name: 'Parameters', href: '#parameters', level: 2 },
  { name: 'Examples', href: '#examples', level: 2 },
  { name: 'Basic Accordion', href: '#basic-accordion', level: 3 },
  { name: 'With Table and Code', href: '#with-table-and-code', level: 3 },
];
const accordionHeadings = [
  'What is this accordion component?',
  'How does it work?',
  'Can I use multiple accordions?',
  '1. Initial Setup',
  '2. Status Check',
];

function getAside(page) {
  return page.locator('.onthispage.block aside');
}

async function openOnThisPage(page, hash = '') {
  await openDevDocsReferencePage(page, { path: `${path}${hash}`, heading: 'Accordion Block' });
  await expect(page.locator('.onthispage.block')).toHaveAttribute('data-block-status', 'loaded');
  await expect(getAside(page).getByRole('link')).toHaveCount(entries.length);
}

test.describe('On This Page reference', () => {
  // Match the desktop documentation layout used for this fixture's TOC.
  test.use({ viewport: { width: 1440, height: 900 } });

  test('generates ordered page-heading links and excludes block-internal headings', async ({ page }) => {
    await openOnThisPage(page);
    const aside = getAside(page);
    const links = aside.getByRole('link');

    await expect(aside.getByRole('heading', { level: 4, name: 'ON THIS PAGE', exact: true })).toBeVisible();
    await expect(links).toHaveText(entries.map(({ name }) => name));

    for (const [index, entry] of entries.entries()) {
      const link = links.nth(index);
      await expect(link).toHaveAttribute('href', entry.href);
      await expect(link).toHaveCSS('padding-left', entry.level === 3 ? '16px' : '0px');
      await expect(page.getByRole('heading', {
        level: entry.level, name: entry.name, exact: true,
      })).toHaveAttribute('id', entry.href.slice(1));
    }

    // Prove the excluded H3s actually exist in decorated accordion items.
    // Broadening the TOC back to all h2/h3 must not include these headings.
    for (const name of accordionHeadings) {
      await expect(page.locator('.accordionitem.block').getByRole('heading', {
        level: 3, name, exact: true,
      })).toHaveCount(1);
      await expect(aside.getByRole('link', { name, exact: true })).toHaveCount(0);
    }
    // The assistant is loaded separately and may be disabled on a preview.
    await expect(aside.getByRole('link', {
      name: 'Adobe Developer AI assistant', exact: true,
    })).toHaveCount(0);
  });

  for (const { title, hash, href } of [
    { title: 'activates the first entry initially without a hash', hash: '', href: '#syntax' },
    { title: 'activates the matching entry initially when loaded with a hash', hash: '#basic-accordion', href: '#basic-accordion' },
  ]) {
    test(title, async ({ page }) => {
      // Observe, without altering the DOM or IntersectionObserver, the first
      // active state produced by decoration. Scroll-spy can replace it on the
      // first frame, especially when native hash scrolling moves the page.
      await page.addInitScript(() => {
        const observer = new MutationObserver(() => {
          const active = document.querySelectorAll('.onthispage.block aside a.active');
          if (active.length) {
            window.initialOnThisPage = {
              hash: window.location.hash,
              href: active[0].getAttribute('href'),
              activeCount: active.length,
            };
            observer.disconnect();
          }
        });
        observer.observe(document, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['class'],
        });
      });

      await openOnThisPage(page, hash);
      await expect(page).toHaveURL(`${new URL(path, page.url())}${hash}`);
      await expect.poll(() => page.evaluate(() => window.initialOnThisPage)).toEqual({
        hash, href, activeCount: 1,
      });
    });
  }

  test('clicking an entry updates the hash, active link and heading position', async ({ page }) => {
    await openOnThisPage(page);
    const aside = getAside(page);
    const target = page.getByRole('heading', { level: 3, name: 'With Table and Code', exact: true });
    const header = page.locator('body > header');

    await expect(aside.locator('a.active')).toHaveAttribute('href', '#syntax');
    await expect(header.getByRole('link', { name: 'Adobe Developer', exact: true })).toBeVisible();
    await expect(target).not.toBeInViewport();
    await aside.getByRole('link', { name: 'With Table and Code', exact: true }).click();
    const clickCompletedAt = Date.now();

    await expect(page).toHaveURL(/#with-table-and-code$/);
    await expect(aside.locator('a.active')).toHaveCount(1);
    await expect(aside.locator('a.active')).toHaveAttribute('href', '#with-table-and-code');
    await expect.poll(async () => {
      const targetBox = await target.boundingBox();
      const headerBox = await header.boundingBox();
      return targetBox !== null && headerBox !== null
        && targetBox.y >= headerBox.y + headerBox.height
        && targetBox.y + targetBox.height <= page.viewportSize().height;
    }, { message: 'the clicked heading should be fully in view below the fixed/sticky header' }).toBe(true);

    // Sample through the 500ms click pause and another pause-length window
    // for the delayed re-scroll and observer callbacks. Retain any mismatch
    // so a transient reversal cannot be hidden by a later successful poll.
    let unexpectedActiveHrefs = null;
    await expect.poll(async () => {
      const activeHrefs = await aside.locator('a.active').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      if (activeHrefs.length !== 1 || activeHrefs[0] !== '#with-table-and-code') {
        unexpectedActiveHrefs = unexpectedActiveHrefs ?? activeHrefs;
      }
      return {
        activeHrefs: unexpectedActiveHrefs ?? activeHrefs,
        observationComplete: Date.now() - clickCompletedAt >= 1_000,
      };
    }, {
      message: 'the clicked entry should remain exclusively active through and after the 500ms click pause',
      intervals: [100],
    }).toEqual({ activeHrefs: ['#with-table-and-code'], observationComplete: true });
  });

  test('scroll-spy moves the active link when a later heading enters view', async ({ page }) => {
    await openOnThisPage(page);
    const aside = getAside(page);
    const target = page.getByRole('heading', { level: 3, name: 'With Table and Code', exact: true });

    await expect(aside.locator('a.active')).toHaveAttribute('href', '#syntax');
    // No preceding click: the block's 500ms click suppression cannot mask this
    // observer update. Put the heading at 30% of the viewport, inside the
    // observer's band, with the preceding headings above that band.
    await target.evaluate((heading) => window.scrollTo({
      top: window.scrollY + heading.getBoundingClientRect().top - window.innerHeight * 0.3,
      behavior: 'instant',
    }));

    await expect(target).toBeInViewport();
    const precedingHeading = page.getByRole('heading', { level: 3, name: 'Basic Accordion', exact: true });
    await expect.poll(() => precedingHeading.evaluate((heading) => heading.getBoundingClientRect().bottom), {
      message: 'fixture spacing: Basic Accordion must end above the scroll-spy band before With Table and Code can be the sole candidate',
    }).toBeLessThanOrEqual(page.viewportSize().height * 0.2);
    await expect.poll(() => aside.locator('a.active').getAttribute('href')).toBe('#with-table-and-code');
    await expect(aside.locator('a.active')).toHaveCount(1);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('matches the generated aside visual snapshot', async ({ page }) => {
    await openOnThisPage(page);
    await hideNonComponentContent(page);
    await page.evaluate(() => document.fonts.ready);
    const aside = getAside(page);

    await expect(aside.getByRole('link')).toHaveText(entries.map(({ name }) => name));
    await expect(aside.locator('a.active')).toHaveCount(1);
    await expect(aside.locator('a.active')).toHaveAttribute('href', '#syntax');
    await expect(aside).toHaveScreenshot('onthispage.png');
  });
});
