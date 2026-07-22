import {
  createTag,
  decorateButtons,
  removeEmptyPTags,
  decorateAnchorLink,
} from '../../scripts/lib-adobeio.js';
import {
  createOptimizedPicture,
  decorateLightOrDark,
} from '../../scripts/lib-helix.js';

/**
 * Returns the partner label from the selector column.
 * @param {Element} selectorDiv
 * @param {number} index
 */
function getPartnerLabel(selectorDiv, index) {
  const label = selectorDiv?.querySelector('.button-container a, a.button')?.textContent?.trim();
  return label || `Partner ${index + 1}`;
}

/**
 * Applies typography and button styles to the active content panel.
 * @param {Element} contentArea
 */
function decorateContentArea(contentArea) {
  contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'partner-showcase-heading');
    decorateAnchorLink(heading);
  });

  contentArea.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.classList.contains('button-container')) {
      paragraph.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    }
  });

  decorateButtons(contentArea);
}

/**
 * Optimizes images inside a container.
 * @param {Element} container
 */
function optimizeImages(container) {
  container.querySelectorAll('picture > img').forEach((img) => {
    const existingPicture = img.closest('picture');
    if (!existingPicture || existingPicture.dataset.optimized) return;
    const picture = createOptimizedPicture(img.src, img.alt);
    picture.dataset.optimized = 'true';
    existingPicture.replaceWith(picture);
  });
}

/**
 * Decorates the partner showcase block.
 * @param {Element} block
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'partner-showcase');
  decorateLightOrDark(block);
  removeEmptyPTags(block);

  const partnerRows = [...block.children].filter((child) => child.tagName === 'DIV');
  if (partnerRows.length === 0) return;

  const partners = partnerRows.map((row, index) => {
    const [mediaDiv, contentDiv, selectorDiv] = row.children;
    return {
      mediaDiv,
      contentDiv,
      selectorDiv,
      label: getPartnerLabel(selectorDiv, index),
      logo: selectorDiv?.querySelector('picture')?.cloneNode(true),
      index,
    };
  });

  const showcase = createTag('div', { class: 'partner-showcase-inner' });
  const mediaPanel = createTag('div', { class: 'partner-showcase-media' });
  const indicator = createTag('div', { class: 'partner-showcase-indicator' });
  const featureImage = createTag('div', { class: 'partner-showcase-feature' });
  const contentPanel = createTag('div', { class: 'partner-showcase-content' });
  const contentArea = createTag('div', { class: 'partner-showcase-text' });
  const navArea = createTag('div', { class: 'partner-showcase-nav' });

  const setActivePartner = (index) => {
    const partner = partners[index];
    if (!partner) return;

    featureImage.innerHTML = '';
    featureImage.appendChild(partner.mediaDiv.cloneNode(true));

    contentArea.innerHTML = '';
    contentArea.appendChild(partner.contentDiv.cloneNode(true));
    decorateContentArea(contentArea);
    optimizeImages(featureImage);

    block.querySelectorAll('.partner-showcase-indicator-cell, .partner-showcase-nav-item').forEach((element) => {
      element.classList.toggle('active', Number(element.dataset.partnerIndex) === index);
    });
  };

  partners.forEach((partner, index) => {
    const indicatorCell = createTag('button', {
      class: 'partner-showcase-indicator-cell',
      type: 'button',
      'aria-label': partner.label,
      'data-partner-index': index,
    });
    if (index === 0) indicatorCell.classList.add('active');
    indicatorCell.addEventListener('click', () => setActivePartner(index));
    indicator.appendChild(indicatorCell);

    const navItem = createTag('button', {
      class: 'partner-showcase-nav-item',
      type: 'button',
      'aria-label': partner.label,
      'data-partner-index': index,
    });
    if (index === 0) navItem.classList.add('active');

    const logoWrap = createTag('div', { class: 'partner-showcase-nav-logo' });
    if (partner.logo) logoWrap.appendChild(partner.logo);

    const name = createTag('span', { class: 'partner-showcase-nav-name' });
    name.textContent = partner.label;

    navItem.appendChild(logoWrap);
    navItem.appendChild(name);
    navItem.addEventListener('click', () => setActivePartner(index));
    navArea.appendChild(navItem);
  });

  mediaPanel.appendChild(indicator);
  mediaPanel.appendChild(featureImage);
  contentPanel.appendChild(contentArea);
  contentPanel.appendChild(navArea);
  showcase.appendChild(mediaPanel);
  showcase.appendChild(contentPanel);

  block.innerHTML = '';
  block.appendChild(showcase);

  setActivePartner(0);
  optimizeImages(navArea);

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      optimizeImages(block);
    }
  });
  observer.observe(block);
}
