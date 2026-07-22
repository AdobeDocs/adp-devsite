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

function optimizeImages(container) {
  container.querySelectorAll('picture > img').forEach((img) => {
    const pic = img.closest('picture');
    if (!pic || pic.dataset.optimized) return;
    const optimized = createOptimizedPicture(img.src, img.alt);
    optimized.dataset.optimized = 'true';
    pic.replaceWith(optimized);
  });
}

function isCtaLink(link, paragraph) {
  if (link.closest('.button-container') || link.parentElement?.tagName === 'STRONG' || link.classList.contains('button')) {
    return true;
  }

  const links = [...paragraph.querySelectorAll('a')];
  const nodes = [...paragraph.childNodes].filter((n) => n.nodeType !== 3 || n.textContent.trim());

  if (links.length === 1 && nodes.length === 1 && (nodes[0] === link || nodes[0]?.contains?.(link))) {
    return true;
  }

  if (link !== links.at(-1)) return false;

  const linkIndex = [...paragraph.childNodes].indexOf(link);
  return linkIndex > -1 && [...paragraph.childNodes].slice(0, linkIndex).some((n) => n.nodeName === 'BR');
}

function decorateContent(content) {
  content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => {
    heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'partner-showcase-heading');
    decorateAnchorLink(heading);
  });

  const buttonGroup = createTag('div', { class: 'partner-showcase-button-container' });

  [...content.querySelectorAll('p')].forEach((paragraph) => {
    if (paragraph.classList.contains('button-container')) {
      buttonGroup.append(paragraph);
      return;
    }

    paragraph.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    [...paragraph.querySelectorAll('a')].filter((link) => isCtaLink(link, paragraph)).forEach((link) => {
      [...paragraph.childNodes].slice(0, [...paragraph.childNodes].indexOf(link)).reverse().forEach((node) => {
        if (node.nodeName === 'BR' || (node.nodeType === 3 && !node.textContent.trim())) node.remove();
      });
      const buttonParagraph = createTag('p', { class: 'button-container' });
      buttonParagraph.append(link.parentElement?.tagName === 'STRONG' ? link.parentElement : link);
      buttonGroup.append(buttonParagraph);
    });

    paragraph.querySelectorAll('a').forEach((link) => {
      if (!link.closest('.partner-showcase-button-container')) {
        link.classList.add('spectrum-Link', 'spectrum-Link--quiet');
      }
    });

    if (!paragraph.textContent.trim() && !paragraph.querySelector('img,picture')) paragraph.remove();
  });

  if (buttonGroup.childElementCount) content.append(buttonGroup);
  decorateButtons(content);
}

export default async function decorate(block) {
  block.setAttribute('daa-lh', 'partner-showcase');
  decorateLightOrDark(block);
  removeEmptyPTags(block);

  const rows = [...block.children].filter((child) => child.tagName === 'DIV');
  if (!rows.length) return;

  const partners = rows.map((row, index) => {
    const [media, content, selector] = row.children;
    const text = content?.cloneNode(true);
    if (text) decorateContent(text);
    return {
      media: media?.cloneNode(true),
      text,
      label: selector?.querySelectorAll('p')[1]?.textContent?.trim(),
      logo: selector?.querySelector('picture')?.cloneNode(true),
    };
  });

  const feature = createTag('div', { class: 'partner-showcase-feature' });
  const contentArea = createTag('div', { class: 'partner-showcase-text' });
  const nav = createTag('div', { class: 'partner-showcase-nav' });

  const setActive = (index) => {
    const partner = partners[index];
    if (!partner) return;
    feature.replaceChildren(...(partner.media ? [partner.media.cloneNode(true)] : []));
    contentArea.replaceChildren(...(partner.text ? [partner.text.cloneNode(true)] : []));
    nav.querySelectorAll('.partner-showcase-nav-item').forEach((btn, i) => btn.classList.toggle('active', i === index));
    optimizeImages(feature);
  };

  partners.forEach((partner, index) => {
    const item = createTag('button', {
      class: 'partner-showcase-nav-item',
      type: 'button',
      'aria-label': partner.label,
    });
    if (!index) item.classList.add('active');

    const logo = createTag('div', { class: 'partner-showcase-nav-logo' });
    if (partner.logo) logo.append(partner.logo);

    const name = createTag('span', { class: 'partner-showcase-nav-name spectrum-Body spectrum-Body--sizeM' });
    name.textContent = partner.label;
    item.append(logo, name);
    item.addEventListener('click', () => setActive(index));
    nav.append(item);
  });

  const inner = createTag('div', { class: 'partner-showcase-inner' });
  const media = createTag('div', { class: 'partner-showcase-media' });
  const panel = createTag('div', { class: 'partner-showcase-content' });
  media.append(feature);
  panel.append(contentArea, nav);
  inner.append(media, panel);
  block.replaceChildren(inner);

  setActive(0);
  optimizeImages(nav);

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      optimizeImages(block);
    }
  });
  observer.observe(block);
}
