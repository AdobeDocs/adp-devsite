import { createTag, decorateAnchorLink } from '../../scripts/lib-adobeio.js';
import { getMetadata } from '../../scripts/scripts.js';

/**
 * decorates the list
 * @param {Element} block The list block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'list');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeM', 'column-header');
    decorateAnchorLink(h);
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
  });
  block.querySelectorAll('li').forEach((list) => {
    list.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
  });

  block.querySelectorAll('ul, ol').forEach((unorder) => {
    unorder.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
  });

  if (getMetadata('template') === 'documentation') {
    const icon = block.getAttribute('data-icon') || 'checkmark';
    const iconColor = block.getAttribute('data-iconColor') || 'black';
    const firstDivs = block.querySelectorAll('.list > div');
    firstDivs.forEach((div) => {
      div.style.setProperty('padding', '0px', 'important');
    });
    const listDivs = block.querySelectorAll('.list > div > div');
    listDivs.forEach((div, index) => {
      div.classList.add('listDiv');
      if (index % 2 === 0) {
        div.classList.add('divBorder');
      }
      const addIcon = createTag('div', { class: 'icon-div' });
      addIcon.textContent = icon === 'disc' ? '\u25CF' : '\u2714';
      addIcon.style.color = iconColor ? iconColor : 'black';
      div.insertBefore(addIcon, div.firstChild);
    });
  }
}
