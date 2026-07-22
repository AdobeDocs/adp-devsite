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
import {
  applyVideoContainer,
  getVideoTitle,
  parseVideoSource,
} from '../../scripts/video.js';

function optimizeImages(container) {
  container.querySelectorAll('picture > img').forEach((img) => {
    const pic = img.closest('picture');
    if (!pic || pic.dataset.optimized) return;
    const optimized = createOptimizedPicture(img.src, img.alt);
    optimized.dataset.optimized = 'true';
    pic.replaceWith(optimized);
  });
}

function prepareMedia(mediaDiv, block) {
  if (!mediaDiv) return null;
  if (block.classList.contains('video')) {
    const videoSource = parseVideoSource(mediaDiv);
    if (videoSource) {
      const wrapper = createTag('div');
      applyVideoContainer(wrapper, {
        url: videoSource.url,
        title: getVideoTitle(videoSource.url, videoSource.linkText),
        autoplay: true,
        muted: true,
        loop: true,
        controls: block.classList.contains('controls'),
      });
      return wrapper;
    }
  }
  return mediaDiv.cloneNode(true);
}

function hasVisualMedia(mediaDiv, block) {
  if (!mediaDiv) return false;
  if (block.classList.contains('video') && parseVideoSource(mediaDiv)) return true;
  return !!mediaDiv.querySelector('picture, img, video, .video-container');
}

// shared by both the content column and the "text as media" fallback
function decorateTypography(container) {
  container.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => {
    heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'partner-showcase-heading');
    decorateAnchorLink(heading);
  });
  container.querySelectorAll('p').forEach((p) => p.classList.add('spectrum-Body', 'spectrum-Body--sizeM'));
}

function preparePartnerMedia(mediaDiv, text, block) {
  if (hasVisualMedia(mediaDiv, block)) {
    return { media: prepareMedia(mediaDiv, block), text, isTextFallback: false };
  }
  if (mediaDiv?.textContent?.trim()) {
    const mediaText = mediaDiv.cloneNode(true);
    decorateTypography(mediaText);
    mediaText.classList.add('partner-showcase-media-text');
    return { media: mediaText, text, isTextFallback: true };
  }
  if (text?.textContent?.trim()) {
    const fallbackText = text.cloneNode(true);
    fallbackText.classList.add('partner-showcase-media-text');
    return { media: fallbackText, text: null, isTextFallback: true };
  }
  return { media: null, text, isTextFallback: false };
}

function isCtaLink(link, paragraph) {
  if (link.closest('.button-container') || link.parentElement?.tagName === 'STRONG' || link.classList.contains('button')) {
    return true;
  }
  const childNodes = [...paragraph.childNodes];
  const links = [...paragraph.querySelectorAll('a')];
  const nodes = childNodes.filter((n) => n.nodeType !== 3 || n.textContent.trim());

  if (links.length === 1 && nodes.length === 1 && (nodes[0] === link || nodes[0]?.contains?.(link))) {
    return true;
  }
  if (link !== links.at(-1)) return false;

  const linkIndex = childNodes.indexOf(link);
  return linkIndex > -1 && childNodes.slice(0, linkIndex).some((n) => n.nodeName === 'BR');
}

function decorateContent(content) {
  decorateTypography(content);
  const buttonGroup = createTag('div', { class: 'partner-showcase-button-container' });

  [...content.querySelectorAll('p')].forEach((paragraph) => {
    if (paragraph.classList.contains('button-container')) {
      buttonGroup.append(paragraph);
      return;
    }

    [...paragraph.querySelectorAll('a')].filter((link) => isCtaLink(link, paragraph)).forEach((link) => {
      const childNodes = [...paragraph.childNodes];
      childNodes.slice(0, childNodes.indexOf(link)).reverse().forEach((node) => {
        if (node.nodeName === 'BR' || (node.nodeType === 3 && !node.textContent.trim())) node.remove();
      });
      const buttonParagraph = createTag('p', { class: 'button-container' });
      buttonParagraph.append(link.parentElement?.tagName === 'STRONG' ? link.parentElement : link);
      buttonGroup.append(buttonParagraph);
    });

    paragraph.querySelectorAll('a').forEach((link) => {
      if (!link.closest('.partner-showcase-button-container')) link.classList.add('spectrum-Link', 'spectrum-Link--quiet');
    });

    if (!paragraph.textContent.trim() && !paragraph.querySelector('img,picture')) paragraph.remove();
  });

  if (buttonGroup.childElementCount) content.append(buttonGroup);
  decorateButtons(content);
}

function buildNavItem(partner, index, onSelect) {
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

  if (partner.logo && partner.label) item.append(logo, name);
  else item.append(partner.logo ? logo : name);

  item.addEventListener('click', () => onSelect(index));
  return item;
}

export default async function decorate(block) {
  block.setAttribute('daa-lh', 'partner-showcase');
  decorateLightOrDark(block);
  removeEmptyPTags(block);

  const isVideo = block.classList.contains('video');
  const rows = [...block.children].filter((child) => child.tagName === 'DIV');
  if (!rows.length) return;

  const partners = rows.map((row) => {
    const [media, content, selector] = row.children;
    const text = content?.cloneNode(true);
    if (text) decorateContent(text);
    const { media: mediaContent, text: panelText, isTextFallback } = preparePartnerMedia(media, text, block);
    const selectorParagraphs = [...selector?.children || []].filter((el) => el.tagName === 'P');
    return {
      media: mediaContent,
      text: panelText,
      isTextFallback,
      label: selectorParagraphs[1]?.textContent?.trim() || selector?.textContent?.trim(),
      logo: selector?.querySelector('picture')?.cloneNode(true),
    };
  });

  const feature = createTag('div', { class: 'partner-showcase-feature' });
  const contentArea = createTag('div', { class: 'partner-showcase-text' });
  const nav = createTag('div', { class: 'partner-showcase-nav' });

  partners.forEach((partner, index) => {
    const mediaPanel = createTag('div', { class: 'partner-showcase-media-panel' });
    if (index === 0) mediaPanel.classList.add('active');
    if (partner.isTextFallback) mediaPanel.classList.add('is-text-fallback');
    if (partner.media) mediaPanel.append(partner.media);
    feature.append(mediaPanel);

    const contentPanel = createTag('div', { class: 'partner-showcase-content-panel' });
    if (index === 0) contentPanel.classList.add('active');
    if (partner.isTextFallback && !partner.text) contentPanel.classList.add('is-empty');
    if (partner.text) contentPanel.append(partner.text);
    contentArea.append(contentPanel);
  });

  const setActive = (index) => {
    feature.querySelectorAll('.partner-showcase-media-panel').forEach((panel, i) => panel.classList.toggle('active', i === index));
    contentArea.querySelectorAll('.partner-showcase-content-panel').forEach((panel, i) => panel.classList.toggle('active', i === index));
    nav.querySelectorAll('.partner-showcase-nav-item').forEach((btn, i) => btn.classList.toggle('active', i === index));
  };

  partners.forEach((partner, index) => nav.append(buildNavItem(partner, index, setActive)));

  const inner = createTag('div', { class: 'partner-showcase-inner' });
  const media = createTag('div', { class: 'partner-showcase-media' });
  const panel = createTag('div', { class: 'partner-showcase-content' });
  if (isVideo) media.classList.add('has-video');
  media.append(feature);
  panel.append(contentArea, nav);
  inner.append(media, panel);
  block.replaceChildren(inner);

  optimizeImages(block);
  optimizeImages(nav);

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      optimizeImages(block);
    }
  });
  observer.observe(block);
}