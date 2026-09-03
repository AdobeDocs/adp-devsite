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

function decorateCaption(block) {
  const rows = block.querySelectorAll(':scope > div');
  const img = rows[0]?.querySelector('img');
  if (!img) return;

  const altRow = rows[1];
  if (altRow) {
    const captionId = `caption-${Math.random().toString(36).substring(2, 9)}`;
    altRow.id = captionId;
    altRow.style.display = 'none';
    img.setAttribute('aria-labelledby', captionId);
  }

  if (img.getAttribute('alt') === 'undefined' || !img.hasAttribute('alt')) {
    img.setAttribute('alt', '');
  }
}

export default async function decorate(block) {
  block.setAttribute('daa-lh', 'banner');

  decorateBackgroundColor(block);

  if (block.classList.contains('image')) {
    decorateCaption(block);
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
