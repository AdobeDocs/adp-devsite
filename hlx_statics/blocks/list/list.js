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

    const listFirstDivs = createTag('ul',{class:'spectrum-Body spectrum-Body--sizeM'});
    Object.assign(listFirstDivs.style, {
      listStyleType: 'none',
      padding: '0px 50px 0px 25px',
      borderRight: '1px solid rgb(213, 213, 213)',
    });
    const listSecondDivs = createTag('ul',{class:'spectrum-Body spectrum-Body--sizeM'});

    const divs = block.querySelectorAll('div');
    divs.forEach(parentDiv => {
      const firstDiv = parentDiv.querySelector('div:first-child');
      const secondDiv = parentDiv.querySelector('div:nth-child(2)');
      const firstDivListItem = createTag('li');
      const secondDivListItem = createTag('li');
      if (firstDiv && firstDiv.textContent.trim() !== '') {
        firstDivListItem.appendChild(firstDiv);
      }
      if (secondDiv && secondDiv.textContent.trim() !== '') {
        secondDivListItem.appendChild(secondDiv);
      }
      if (firstDivListItem.hasChildNodes()) {
        listFirstDivs.appendChild(firstDivListItem);
      }
      if (secondDivListItem.hasChildNodes()) {
        listSecondDivs.appendChild(secondDivListItem);
      }
    });

    block.innerHTML = '';
    block.appendChild(listFirstDivs);
    block.appendChild(listSecondDivs);
    listSecondDivs.style.listStyleType = 'none';
    
    const buttonContainer = block.querySelectorAll('li');
    buttonContainer.forEach((li) => {
      Object.assign(li.style, {
        display: 'flex',
        columnGap: '10px',
      });
      const addIcon = createTag('div', { class:'icon-div'});
      addIcon.textContent = icon === 'disc'? '\u25CF':'\u2714';
      addIcon.style.color = iconColor? iconColor: 'black';  
      li.insertBefore(addIcon, li.firstChild);
    });
    block.style.display = 'flex';
  }
}
