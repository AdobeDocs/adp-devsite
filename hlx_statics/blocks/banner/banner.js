import { decorateButtons, removeEmptyPTags } from '../../scripts/lib-adobeio.js';

/**
 * Decorates the banner block
 * @param {Element} block - The banner block element
 */
export default async function decorate(block) {
  block.classList.forEach(clr => {
    if (clr.startsWith('black')) {
      block.parentElement.classList.add(clr);
    }
  });

  block.setAttribute('daa-lh', 'banner');

  const h1s = block.querySelectorAll('h1');
  const contentEls = block.querySelectorAll('p, div');

  if (h1s.length > 0) {
    block.classList.add('isH');
    h1s.forEach(h1 => h1.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXL'));
  }

  contentEls.forEach(el => {
    const hasText = el.textContent.trim().length > 0;

    if (el.tagName === 'P') block.classList.add('isP');
    if (hasText || el.tagName === 'P') {
      el.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    }
  });

  decorateButtons(block);
  removeEmptyPTags(block);
}
