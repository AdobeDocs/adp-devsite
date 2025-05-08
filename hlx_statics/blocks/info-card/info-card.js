import { createTag, removeEmptyPTags, decorateButtons } from '../../scripts/lib-adobeio.js';
import {
  createOptimizedPicture,
} from '../../scripts/lib-helix.js';

/**
 * decorates the info-card
 * @param {Element} block The info-card block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'info-card');
  removeEmptyPTags(block);
  let containerParent;
  if (block.classList.contains('primarybutton')) {
    const primaryButton = block.querySelectorAll('a')[0];
    const up = primaryButton.parentElement;
    const container = createTag('p', {class: 'button-container'});
    containerParent = primaryButton.parentElement.parentElement.parentElement;
    containerParent.appendChild(container);
    container.appendChild(up);
    if (!primaryButton.querySelector('img')) {
      if (up.childNodes.length === 1 && up.tagName === 'STRONG'){
        primaryButton.className = 'button primary';
      }
    }
    decorateButtons(containerParent);
  }
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const a = document.createElement('a');

    const image = row.querySelector('img') || row.querySelector('picture img');
    if (image) {
      const imageDiv = createTag('div', { class: 'cards-card-image' });
      imageDiv.appendChild(
        createOptimizedPicture(image.src, image.alt, false, [{ width: `${image.naturalWidth}` }])
      );
      a.appendChild(imageDiv);
    }

    const textDiv = createTag('div', { class: 'cards-card-body' });   
    
    const headingElement = row.querySelector('h1, h2, h3, h4, h5, h6') || row.querySelector('a');
    if (headingElement) {
      const anchorHref = row.querySelector('a');
      if (anchorHref) {
        const h3 = document.createElement('h3');
        h3.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS','card-heading');
        h3.textContent = headingElement.textContent.trim();
        textDiv.appendChild(h3);
        headingElement.href ?  a.href = headingElement.href : a.href = anchorHref.href ;
      } else {
        headingElement.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS','card-heading');
        textDiv.appendChild(headingElement);
      }
    }
          
    const description = row.querySelector('p') || row.querySelector('.info-card > div > div:last-child');
    if (description && description.textContent.trim() !== '') {
      const p = document.createElement('p');
      p.style.color = 'rgb(110, 110, 110)';
      p.innerHTML = description.innerHTML;
      textDiv.appendChild(p);
    }    
            
    a.appendChild(textDiv);
    li.appendChild(a);
    ul.appendChild(li);

  });
  
  block.textContent = '';
  block.appendChild(ul);

  block.querySelectorAll('.icon').forEach((s) => {
    const p_parent = s.parentElement;
    const div_parent = createTag('div', {class: 'icon-div'});
    p_parent.classList.add('icon-p');
    p_parent.parentElement.appendChild(div_parent);
    div_parent.appendChild(p_parent)
  });

  if (block.classList.contains('primarybutton')) {
    block.appendChild(containerParent);
  }
}
