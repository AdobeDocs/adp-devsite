import decorateLink from "../../components/link.js";
import { createTag } from "../../scripts/lib-adobeio.js";

/**
 * decorates the next-prev
 * @param {Element} block The next-prev block element
 *
 */
export default async function decorate(block) {

  block.innerHTML = '';
  const extractMenuData = (element) => [...element]
    .flatMap(links => [...links.querySelectorAll('li a')])
    .map(link => ({ title: link.textContent, href: link.getAttribute('href') }))
    .filter((value, index, array) => array.findIndex(t => t.href === value.href) === index);

  const sideNavContainer = document.querySelector('.side-nav-subpages-section');

  if (sideNavContainer) {

    const menuData = extractMenuData(sideNavContainer.querySelectorAll('ul'));
    const currentPath = window?.location?.pathname;

    const currentIndex = menuData.findIndex(menu => menu.href === currentPath);
    const pages = [menuData[currentIndex - 1], menuData[currentIndex + 1]];

    const createIconSvg = (direction) => {
      const path = direction === 'left'
        ? 'M12 18a1.988 1.988 0 0 0 .585 1.409l7.983 7.98a2 2 0 1 0 2.871-2.772l-.049-.049L16.819 18l6.572-6.57a2 2 0 0 0-2.773-2.87l-.049.049-7.983 7.98A1.988 1.988 0 0 0 12 18z'
        : 'M24 18a1.988 1.988 0 0 1-.585 1.409l-7.983 7.98a2 2 0 1 1-2.871-2.772l.049-.049L19.181 18l-6.572-6.57a2 2 0 0 1 2.773-2.87l.049.049 7.983 7.98A1.988 1.988 0 0 1 24 18z';
      return `<svg viewBox="0 0 34 34" focusable="false" aria-hidden="true" role="img" class="spectrum-Icon spectrum-Icon--sizeXL"><path d="${path}"></path></svg>`;
    }

    const createLink = (href, title, direction, classname, div) => {
      const a = createTag('a', { class: `anchor-link ${classname}`, href, "aria-label": href });
      const innerText = document.createElement('div');
      innerText.classList.add(direction === 'left' ? 'prev-page-text' : 'next-page-text');
      innerText.textContent = title;

      a.innerHTML = createIconSvg(direction);
      a.appendChild(innerText);
      decorateLink({ link: a });
      a.setAttribute('data-prefetch', 'prefetch');
      div.appendChild(a);
      return div;
    };

    pages.forEach((page, index) => {
      if (page) {
        const direction = index === 0 ? 'left' : 'right';
        const className = index === 0 ? 'previous-page' : 'next-page';
        const div = document.createElement('div');
        div.classList.add(index === 0 ? 'prev-division' : 'next-division');
        block.appendChild(createLink(page.href, page.title, direction, className, div));
      }
    });
  }

}
