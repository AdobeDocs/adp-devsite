import { getMetadata, fetchTopNavHtml, fetchSideNavHtml } from '../../scripts/lib-helix.js';
import { getActiveTab } from '../../scripts/lib-adobeio.js';

const DEFAULT_HOME = {
  title: 'Products',
  href: '/apis/',
};

const chevronRightIcon = `
<svg aria-hidden='true' role='img' class='spectrum-Breadcrumbs-itemSeparator spectrum-Icon spectrum-UIIcon-ChevronRight75'>
  <path
    d="M7.482 4.406l-.001-.001L3.86.783a.84.84 0 00-1.188 1.188L5.702 5l-3.03 3.03A.84.84 0 003.86 9.216l3.621-3.622h.001a.84.84 0 000-1.19z">
  </path>
</svg>
`;

function buildBreadcrumbsFromNavTree(navParser, url) {
  const currentPath = new URL(url, window.location.origin).pathname;
  const links = Array.from(navParser.querySelectorAll('a'));

  let link = links.find(a => {
    const aPath = new URL(a.getAttribute('href'), window.location.origin).pathname;
    return aPath === currentPath;
  });

  if (!link) {
    console.warn(`[Breadcrumbs] No match found for path: ${currentPath}`);
    console.log(`[Breadcrumbs] Available nav links:`, links.map(a => new URL(a.href, window.location.origin).pathname));
    return [];
  }

  let menuItem = link.closest('li');
  const crumbs = [];

  while (menuItem) {
    const crumbLink = menuItem.querySelector(':scope > a');
    if (crumbLink) crumbs.unshift(crumbLink);
    menuItem = menuItem.closest('ul')?.closest('li');
  }

  return crumbs;
}

async function buildBreadcrumbs() {
  const sideNavHtml = await fetchSideNavHtml();
  const sideNavParser = new DOMParser().parseFromString(sideNavHtml, 'text/html');

  const topNavHtml = await fetchTopNavHtml();
  const topNavParser = new DOMParser().parseFromString(topNavHtml, 'text/html');

  const activeTab = getActiveTab(topNavParser);

  // Add title fallback
  [...sideNavParser.querySelectorAll('a'), ...topNavParser.querySelectorAll('a')].forEach((a) => {
    a.title = a.title || a.textContent;
  });

  const sideNavCrumbs = buildBreadcrumbsFromNavTree(sideNavParser, window.location.href);
  const topNavCrumbs = activeTab?.href ? buildBreadcrumbsFromNavTree(topNavParser, activeTab.href) : [];
  const home = topNavParser.querySelector('a');

  return [
    DEFAULT_HOME,
    ...[
      ...(home ? [home] : []),
      ...topNavCrumbs,
      ...sideNavCrumbs,
    ].map(a => ({ title: a.title, href: a.href })),
  ];
}

export default async function decorate(block) {
  const hasHero = Boolean(document.querySelector('.herosimple-container') || document.querySelector('.hero-container'));
  const showBreadcrumbsConfig = getMetadata('hidebreadcrumbnav') !== 'true';
  const showBreadcrumbs = !hasHero && showBreadcrumbsConfig;

  if (showBreadcrumbs) {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.setAttribute('role', 'navigation');
    block.append(nav);

    const ol = document.createElement('ol');
    ol.classList.add('spectrum-Breadcrumbs');
    nav.append(ol);

    try {
      const crumbs = await buildBreadcrumbs();

      const lis = crumbs.map((crumb, index, arr) => {
        const a = document.createElement('a');
        a.classList.add('spectrum-Breadcrumbs-itemLink');
        a.innerText = crumb.title;
        a.href = crumb.href;

        const li = document.createElement('li');
        li.classList.add('spectrum-Breadcrumbs-item');
        li.append(a);

        // Add chevron only if it's not the last crumb
        if (index < arr.length - 1) {
          li.insertAdjacentHTML('beforeend', chevronRightIcon);
        }

        return li;
      });

      ol.append(...lis);
    } catch (err) {
      console.error('Breadcrumbs generation failed:', err);
    }
  } else {
    block.parentElement?.parentElement?.remove();
  }
}
