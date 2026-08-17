import { decorateButtons, removeEmptyPTags } from '../../scripts/lib-adobeio.js';

/**
 * Applies the background color class from the banner block
 * to the parent banner wrapper.
 *
 * Supported classes:
 * - background-color-navy
 * - background-color-white
 * - background-color-gray
 * - background-color-dark-gray
 * - black
 *
 * @param {Element} block The banner block element
 */
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
 * When the banner contains an image:
 * - Get the content from the second direct div
 * - Use that content as the image alt text
 * - Remove the entire second div from the UI
 *
 * @param {Element} block The banner block element
 */
function decorateCaption(block) {
  const rows = block.querySelectorAll(':scope > div');
  console.log("rows",rows)
  if (rows.length < 2) return;

  const captionRow = rows[1];
  console.log("captionRow",captionRow)
  const captionText = captionRow.textContent.trim();
  console.log("captionText",captionText)

  const img = rows[0].querySelector('img');

  if (img && captionText) {
    img.setAttribute('alt', captionText);
  }

  // Remove the entire second div from the UI.
  captionRow.remove();
}

/**
 * Decorates the banner block
 *
 * @param {Element} block - The banner block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'banner');

  // Apply background color before any early return.
  decorateBackgroundColor(block);

  // Image banner handling.
  if (block.classList.contains('image')) {
    decorateCaption(block);
    return;
  }

  const h1s = block.querySelectorAll('h1');
  const contentEls = block.querySelectorAll('p, div');

  if (h1s.length > 0) {
    block.classList.add('isH');

    h1s.forEach((h1) => {
      h1.classList.add(
        'spectrum-Heading',
        'spectrum-Heading--sizeXL',
      );
    });
  }

  contentEls.forEach((el) => {
    const hasText = el.textContent.trim().length > 0;

    if (el.tagName === 'P') {
      block.classList.add('isP');
    }

    if (hasText || el.tagName === 'P') {
      el.classList.add(
        'spectrum-Body',
        'spectrum-Body--sizeM',
      );
    }
  });

  decorateButtons(block);
  removeEmptyPTags(block);
}
