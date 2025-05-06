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

function extractCrumbsFromNav(url, parser) {
  const targetLink = parser.querySelector(`a[href="${url}"]`);
  if (!targetLink) return [];

  const crumbs = [];
  let current = targetLink.closest('li');
  while (current) {
    const link = current.querySelector(':scope > a');
    if (link) crumbs.unshift(link);
    current = current.closest('ul')?.closest('li');
  }

  return crumbs;
}

async function buildBreadcrumbs() {
  const sideNavHtml = await fetchSideNavHtml();
  const sideNavParser = new DOMParser().parseFromString(sideNavHtml, "text/html");

  const sideNavCrumbs = extractCrumbsFromNav(window.location.href, sideNavParser);

  const topNavHtml = await fetchTopNavHtml();
  const topNavParser = new DOMParser().parseFromString(topNavHtml, "text/html");

  const activeTab = getActiveTab(topNavParser);
  const topNavCrumbs = activeTab ? extractCrumbsFromNav(activeTab.href, topNavParser) : [];

  const home = topNavParser.querySelector('a');

  // Ensure all links have titles
  [...sideNavParser.querySelectorAll('a'), ...topNavParser.querySelectorAll('a')].forEach((a) => {
    a.title = a.title || a.textContent;
  });

  return [
    DEFAULT_HOME,
    ...[...(home ? [home] : []), ...topNavCrumbs, ...sideNavCrumbs].map(a => ({
      title: a.title,
      href: a.href
    }))
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
