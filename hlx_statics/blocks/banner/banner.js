import { decorateButtons, removeEmptyPTags } from '../../scripts/lib-adobeio.js';

function decorateBackgroundColor(block) {
  const backgroundColors = [
    'background-color-navy',
    'background-color-white',
    'background-color-gray',
    'background-color-dark-gray',
    'black',
  ];

  backgroundColors.forEach((colorClass) => {
    if (block.classList.contains(colorClass)) {
      block.parentElement?.classList.add(colorClass);
    }
  });
}

/**
 * @param {Element} block The banner block element
 * @returns {boolean} true if a caption row was found and handled
 */
function decorateCaption(block) {
  const rows = block.querySelectorAll(':scope > div');
  if (rows.length < 2) return false;

  const imgRow = rows[0];
  const captionRow = rows[1];

  const img = imgRow.querySelector('img');
  if (!img) return false;

  const captionText = captionRow.textContent.trim();
  if (captionText) {
    img.setAttribute('alt', captionText);
  }

  captionRow.remove();
  return true;
}

export default async function decorate(block) {
  block.setAttribute('daa-lh', 'banner');

  decorateBackgroundColor(block);

  const firstRow = block.querySelector(':scope > div');
  const looksLikeImageBanner = block.classList.contains('image')
    || (firstRow && firstRow.querySelector('img') && !firstRow.querySelector('h1'));

  if (looksLikeImageBanner) {
    const handled = decorateCaption(block);
    if (handled) {
      block.classList.add('image');
      return;
    }
  }

  const h1s = block.querySelectorAll('h1');
  const contentEls = block.querySelectorAll('p, div');

  if (h1s.length > 0) {
    block.classList.add('isH');
    h1s.forEach((h1) => {
      h1.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXL');
    });
  }

  contentEls.forEach((el) => {
    const hasText = el.textContent.trim().length > 0;
    if (el.tagName === 'P') {
      block.classList.add('isP');
    }
    if (hasText || el.tagName === 'P') {
      el.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    }
  });

  decorateButtons(block);
  removeEmptyPTags(block);
}
