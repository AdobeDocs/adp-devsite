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

function normalizeUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function buildBreadcrumbsFromNavTree(navParser, targetUrl) {
  const normalizedTarget = normalizeUrl(targetUrl);

  let matchPath = null;
  let maxDepth = -1;

  navParser.querySelectorAll('a').forEach((a) => {
    const href = normalizeUrl(a.href);
    if (href === normalizedTarget) {
      let depth = 0;
      let listItem = a.closest('li');
      while (listItem) {
        depth++;
        listItem = listItem.closest('ul')?.closest('li');
      }
      if (depth > maxDepth) {
        matchPath = a;
        maxDepth = depth;
      }
    }
  });

  const crumbs = [];
  let menuItems = matchPath?.closest('li');
  while (menuItems) {
    const link = menuItems.querySelector(':scope > a');
    if (link) crumbs.unshift(link);
    menuItems = menuItems.closest('ul')?.closest('li');
  }

  // Ensure we include the matchPath itself if it wasn't already added
  if (matchPath && !crumbs.includes(matchPath)) {
    crumbs.push(matchPath);
  }

  return crumbs;
}

async function buildBreadcrumbs() {
  const sideNavHtml = await fetchSideNavHtml();
  const sideNavParser = new DOMParser().parseFromString(sideNavHtml, "text/html");

  // Ensure all links have titles
  sideNavParser.querySelectorAll('a').forEach((a) => {
    a.title = a.title || a.textContent;
  });

  const sideNavCrumbs = buildBreadcrumbsFromNavTree(sideNavParser, window.location.href);

  const topNavHtml = await fetchTopNavHtml();
  const topNavParser = new DOMParser().parseFromString(topNavHtml, "text/html");
  topNavParser.querySelectorAll('a').forEach((a) => {
    a.title = a.title || a.textContent;
  });

  const activeTab = getActiveTab(topNavParser);
  const topNavCrumbs = buildBreadcrumbsFromNavTree(topNavParser, activeTab?.href);

  const home = topNavParser.querySelector('a');

  return [
    DEFAULT_HOME,
    ...[
      ...(home ? [home] : []),
      ...topNavCrumbs,
      ...sideNavCrumbs,
    ].map(a => ({ title: a.title, href: a.href }))
  ];
}

export default async function decorate(block) {
  const hasHero = Boolean(document.querySelector('.herosimple-container') || document.querySelector('.hero-container'));
  const showBreadcrumbsConfig = getMetadata('hidebreadcrumbnav') !== 'true';
  const showBreadcrumbs = !hasHero && showBreadcrumbsConfig;

  if (showBreadcrumbs) {
    const nav = document.createElement('nav');
    nav.ariaLabel = "Breadcrumb";
    nav.role = "navigation";
    block.append(nav);

    const ol = document.createElement('ol');
    ol.classList.add('spectrum-Breadcrumbs');
    nav.append(ol);

    const crumbs = await buildBreadcrumbs();
    const lis = crumbs.map(crumb => {
      const a = document.createElement('a');
      a.classList.add('spectrum-Breadcrumbs-itemLink');
      a.innerText = crumb.title;
      a.href = crumb.href;

      const li = document.createElement('li');
      li.classList.add('spectrum-Breadcrumbs-item');
      li.append(a);
      li.insertAdjacentHTML("beforeend", chevronRightIcon);
      return li;
    });

    ol.append(...lis);
  } else {
    block.parentElement?.parentElement?.remove();
  }
}
