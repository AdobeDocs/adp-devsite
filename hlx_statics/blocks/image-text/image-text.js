import { createTag, decorateButtons } from '../../scripts/lib-adobeio.js';

/**
 * Rearranges the links into a image-text-button-container div
 * @param {*} block The image-text block element
 */
function rearrangeLinks(block) {
  const container = block.classList.contains('center') ? block.querySelector('.wrapper-division') : block;

  if (!container) return;

  const leftDiv = container.firstElementChild?.lastElementChild;
  const rightDiv = container.lastElementChild?.lastElementChild;

  if (!leftDiv || !rightDiv) return;
  if (leftDiv.querySelector('a')) {
    const leftButtonContainer = createTag('div', { class: 'image-text-button-container' });
    leftDiv.querySelectorAll('p.button-container').forEach(p => leftButtonContainer.appendChild(p));
    leftDiv.appendChild(leftButtonContainer);
  }
  if (rightDiv.querySelector('a')) {
    const rightButtonContainer = createTag('div', { class: 'image-text-button-container' });
    rightDiv.querySelectorAll('p.button-container').forEach(p => rightButtonContainer.appendChild(p));
    rightDiv.appendChild(rightButtonContainer);
  }
}

/**
 * decorates the image-text
 * @param {Element} block The image-text block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'image-text');

  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'title-heading');
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
  });

  if (block.classList.contains('center')) {
    const firstChild = block.firstElementChild;
    firstChild.querySelectorAll('a').forEach(anchor => {
      const parent = anchor.parentElement;
      const p = createTag('p');
  
      if (parent?.classList.contains('button-container')) {
        p.appendChild(anchor);
        parent.appendChild(p);
      } else if (parent?.tagName === 'STRONG') {
        parent.replaceWith(p);
        p.appendChild(parent);
      }
  
      anchor.closest('div')?.classList.add('all-button-wrapper');
    });
  
    const children = Array.from(block.children);
    if (children.length > 1) {
      const wrapper = createTag('div', { class: 'wrapper-division' });
      children.slice(1).forEach(child => wrapper.appendChild(child));
      block.insertBefore(wrapper, block.children[1]);
    }
  }

  rearrangeLinks(block);
  decorateButtons(block);
}
