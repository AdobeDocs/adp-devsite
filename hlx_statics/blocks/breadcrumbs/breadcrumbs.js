import { getMetadata, fetchTopNavHtml, fetchSideNavHtml } from '../../scripts/lib-helix.js';

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
  const allLinks = Array.from(navParser.querySelectorAll('a'));
  const currentPath = new URL(url, window.location.origin).pathname;

  let link = allLinks
    .filter(link => {
      const linkPath = new URL(link.href, window.location.origin).pathname;
      const linkDhref = link.getAttribute('dhref');
      return currentPath.startsWith(linkPath) || (linkDhref && currentPath.startsWith(linkDhref));
    })
    .reduce((longest, link) => {
      const linkPathLength = new URL(link.href, window.location.origin).pathname.length;
      return linkPathLength > longest.length ? { link, length: linkPathLength } : longest;
    }, { link: null, length: 0 }).link;

  let menuItem = link?.closest('li');
  const crumbs = [];
  while(menuItem) {
    link = menuItem.querySelector(':scope > a');
    link && crumbs.unshift(link);
    menuItem = menuItem.closest('ul')?.closest('li');
  }

  return crumbs;
}

async function buildBreadcrumbs() {
  const sideNavHtml = await fetchSideNavHtml();
  const sideNavParser = new DOMParser().parseFromString(sideNavHtml, "text/html");
  const sideNavCrumbs = buildBreadcrumbsFromNavTree(sideNavParser, window.location.pathname);

  const topNavHtml = await fetchTopNavHtml();
  const topNavParser = new DOMParser().parseFromString(topNavHtml, "text/html");
  const topNavCrumbs = buildBreadcrumbsFromNavTree(topNavParser, sideNavCrumbs[0]?.href);
  
  const home = topNavParser.querySelector('a');

  return [
    DEFAULT_HOME,
    ...[
      ...(home ? [home] : []),
      ...topNavCrumbs,
      ...sideNavCrumbs,
    ].map(a => ({title: a.title, href: a.href}))
  ];
}

export default async function decorate(block) {
  const hasHero = Boolean(document.querySelector('.herosimple-container') || document.querySelector('.hero-container'));
  const showBreadcrumbsConfig = getMetadata('hidebreadcrumbnav') !== 'true';
  const showBreadcrumbs = !hasHero && showBreadcrumbsConfig;
  if(showBreadcrumbs) {
    const nav = document.createElement('nav');
    nav.ariaLabel = "Breadcrumb";
    nav.role = "navigation";
    block.append(nav);

    const ol = document.createElement('ol');
    ol.classList.add('spectrum-Breadcrumbs');
    nav.append(ol);

    const crumbs = await buildBreadcrumbs();
    const lis = crumbs.map((crumb, i) => {
      const a = document.createElement('a');
      a.classList.add('spectrum-Breadcrumbs-itemLink');
      a.innerText = crumb.title;
      a.href = crumb.href;

      const li = document.createElement('li');
      li.classList.add('spectrum-Breadcrumbs-item');
      li.append(a);
      if (i !== crumbs.length - 1 && crumb.title !== '') {
        li.insertAdjacentHTML("beforeend", chevronRightIcon);
      }

      return li;
    })

    ol.append(...lis);
  } else {
    block.parentElement?.parentElement?.remove();
  }
}
