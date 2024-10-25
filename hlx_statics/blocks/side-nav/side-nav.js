import {
  createTag
} from '../../scripts/lib-adobeio.js';
import { getMetadata } from '../../scripts/lib-helix.js';
/**
 * decorates the side-nav
 * @param {Element} block The site-nav block element
 */
export default async function decorate(block) {
  const navigationLinks = createTag('nav', { role: 'navigation' });
  navigationLinks.setAttribute('aria-label', 'Primary');

  const navigationLinksContainer = createTag('div');
  navigationLinks.append(navigationLinksContainer);

  const navigationLinksUl = createTag('ul', { role: 'tree', class: 'spectrum-SideNav spectrum-SideNav--multiLevel' });
  navigationLinksUl.setAttribute('aria-label', 'Table of contents');
  navigationLinksContainer.append(navigationLinksUl);

  // TODO: have fall back when side nav not available in session
  navigationLinksUl.innerHTML = sessionStorage.getItem('sideNav');

  let sideNavContainer = document.querySelector('.side-nav-container');
  if (sideNavContainer) {
    sideNavContainer.style.gridArea = 'sidenav';
  }
  block.append(navigationLinks);

  block.querySelectorAll('li').forEach((li) => {
    li.classList.add('spectrum-SideNav-item');

  });

  block.querySelectorAll('a').forEach((a) => {

    a.onclick = () => {
      const liparent = a.closest('li');
      const hasExpanded = liparent.classList.contains('is-expanded');

      if (hasExpanded) {
        liparent.classList.remove('is-expanded');
        liparent.setAttribute('aria-expanded', false);

        liparent.querySelectorAll('ul').forEach((ul) => {
          ul.style.display = "none";
        });

        const existingSvg = a.querySelector('svg');
        if (existingSvg) {
          existingSvg.remove();
        }

        a.innerHTML += rightIcon;

        if (window.location.href === a.href) {
          return false;
        }
      }
      return true;
    }

  });

  const rightIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
  <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
</svg>`

  block.querySelectorAll('a').forEach((a) => {
    a.classList.add('spectrum-SideNav-itemLink');
  });
}

