import { decorateButtons, removeEmptyPTags } from '../../scripts/lib-adobeio.js';

/**
 * When the banner contains an image (instead of text), treat the second row
 * as an accessible caption: mark it, give it an id, and wire the img to it
 * via aria-labelledby. The caption is hidden by default (see banner.css).
 * @param {Element} block The banner block element
 */
function decorateCaption(block) {
  const rows = block.querySelectorAll(':scope > div');
  if (rows.length < 2) return;

  const caption = rows[1].firstElementChild;
  if (!caption) return;

  caption.classList.add('caption');

  const captionId = `banner-caption-${Math.random().toString(36).slice(2, 10)}`;
  caption.id = captionId;

  const img = rows[0].querySelector('img');
  if (img) {
    img.setAttribute('aria-labelledby', captionId);
  }
}

/**
 * Decorates the banner block
 * @param {Element} block - The banner block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'banner');

  if (block.classList.contains('image')) {
    decorateCaption(block);
    return;
  }

  block.classList.forEach((clr) => {
    if (clr.startsWith('black')) {
      block.parentElement.classList.add(clr);
    }
  });

  const h1s = block.querySelectorAll('h1');
  const contentEls = block.querySelectorAll('p, div');

  if (h1s.length > 0) {
    block.classList.add('isH');
    h1s.forEach((h1) => h1.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXL'));
  }

  contentEls.forEach((el) => {
    const hasText = el.textContent.trim().length > 0;

    if (el.tagName === 'P') block.classList.add('isP');
    if (hasText || el.tagName === 'P') {
      el.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    }
  });

  decorateButtons(block);
  removeEmptyPTags(block);
}
