import { createTag, removeEmptyPTags, decorateButtons } from '../../scripts/lib-adobeio.js';
import { createOptimizedPicture } from '../../scripts/lib-helix.js';

function getCardBackground(bgSlot) {
  const value = bgSlot?.textContent?.trim();
  if (!value) {
    return { background: '#ffffff', isLight: true };
  }
  return { background: value, isLight: false };
}

function styleCardButton(a, isLight) {
  const isStrong = a.parentElement.tagName === 'STRONG'
    || a.classList.contains('spectrum-Button--accent');
  a.classList.remove(
    'spectrum-Button--secondary',
    'spectrum-Button--outline',
    'spectrum-Button--accent',
    'spectrum-Button--fill',
  );
  a.classList.add('spectrum-Button', 'spectrum-Button--sizeM', 'feature-grid-card-cta');
  if (isLight) {
    if (isStrong) {
      a.classList.add('spectrum-Button--accent', 'spectrum-Button--fill');
    } else {
      a.classList.add('spectrum-Button--secondary', 'spectrum-Button--outline');
    }
  } else {
    a.classList.add('feature-grid-card-cta--on-dark');
  }
}

/**
 * Decorates the feature-grid block.
 * @param {Element} block
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'feature-grid');
  removeEmptyPTags(block);
  decorateButtons(block);

  const ul = createTag('ul', { class: 'feature-grid-list' });

  [...block.children].forEach((row) => {
    const [imageSlot, contentSlot, bgSlot] = row.children;
    if (!contentSlot) return;

    const { background, isLight } = getCardBackground(bgSlot);
    const li = createTag('li', { class: 'feature-grid-card' });
    if (isLight) li.classList.add('feature-grid-card--light');
    li.style.background = background;

    const imageDiv = createTag('div', { class: 'feature-grid-card-image' });
    const image = imageSlot?.querySelector('picture img, img');
    if (image) {
      const picWidth = image.naturalWidth > 0 ? String(image.naturalWidth) : '80';
      imageDiv.appendChild(
        createOptimizedPicture(image.src, image.alt, false, [{ width: picWidth }]),
      );
    }
    li.appendChild(imageDiv);

    const bodyDiv = createTag('div', { class: 'feature-grid-card-body' });

    contentSlot.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeM', 'feature-grid-card-heading');
      bodyDiv.appendChild(heading);
    });

    contentSlot.querySelectorAll('p:not(.button-container)').forEach((p) => {
      if (!p.querySelector('a')) {
        p.classList.add('spectrum-Body', 'spectrum-Body--sizeM', 'feature-grid-card-description');
        bodyDiv.appendChild(p);
      }
    });

    const buttonWrap = createTag('div', { class: 'feature-grid-card-button' });
    contentSlot.querySelectorAll('p').forEach((p) => {
      if (!p.querySelector(':scope > a, :scope > strong > a')) return;
      p.querySelectorAll('a').forEach((a) => styleCardButton(a, isLight));
      buttonWrap.appendChild(p);
    });
    if (buttonWrap.childElementCount) bodyDiv.appendChild(buttonWrap);

    li.appendChild(bodyDiv);
    ul.appendChild(li);
  });

  ul.style.setProperty('--grid-columns', Math.min(ul.children.length, 4) || 1);

  block.textContent = '';
  block.appendChild(ul);
}
