import {removeEmptyPTags } from '../../scripts/lib-adobeio.js';

/**
 * decorates baz
 * @param {Element} block The foo block element
 */
export default async function decorate(block) {
  removeEmptyPTags(block);
  block.setAttribute('daa-lh', 'baz');
  
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'baz-heading');
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeL', 'baz-paragraph');
  });
  block.querySelectorAll('img').forEach((img) => {
    img.classList.add('img-size');
  });
  
}