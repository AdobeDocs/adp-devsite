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

function getPartnerRows(block) {
  const isRow = (row) => [...row.children].filter((el) => el.tagName === 'DIV').length >= 2;
  const topLevel = [...block.children].filter((el) => el.tagName === 'DIV');
  if (topLevel.length > 1 && topLevel.every(isRow)) return topLevel;

  if (topLevel.length === 1) {
    const nested = [...topLevel[0].children].filter((el) => el.tagName === 'DIV');
    if (nested.length > 1 && nested.every(isRow)) return nested;
    if (nested.length >= 2) return topLevel;
  }

  return topLevel;
}

function getPartnerColumns(row) {
  const columns = [...row.children].filter((el) => el.tagName === 'DIV');
  const content = columns.find((col) => col.querySelector('h1,h2,h3,h4,h5,h6'));
  const selector = columns.find((col) => col !== content && col.querySelector('picture') && col.querySelectorAll('p').length > 1);
  const media = columns.find((col) => col !== content && col !== selector) || columns[0];
  return {
    media,
    content: content || columns[1],
    selector: selector || columns[2],
  };
}

function hasValidImage(mediaDiv) {
  const img = mediaDiv?.querySelector('picture img, img');
  if (!img) return false;
  return !!(img.getAttribute('src')?.trim() || img.getAttribute('srcset')?.trim() || img.currentSrc);
}

function hasVisualMedia(mediaDiv, block) {
  if (!mediaDiv) return false;
  if (block.classList.contains('video') && parseVideoSource(mediaDiv)) return true;
  if (hasValidImage(mediaDiv)) return true;
  return !!mediaDiv.querySelector('video, .video-container');
}

function decorateMediaText(mediaEl) {
  mediaEl.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => {
    heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'partner-showcase-heading');
    decorateAnchorLink(heading);
  });
  mediaEl.querySelectorAll('p').forEach((paragraph) => {
    if (!paragraph.classList.contains('button-container')) {
      paragraph.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    }
  });
}

function preparePartnerMedia(mediaDiv, text, block) {
  if (hasVisualMedia(mediaDiv, block)) {
    return { media: prepareMedia(mediaDiv, block), text, isTextFallback: false };
  }

  if (text?.textContent?.trim()) {
    return {
      media: text.cloneNode(true),
      text: null,
      isTextFallback: true,
    };
  }

  if (mediaDiv?.textContent?.trim()) {
    const mediaText = mediaDiv.cloneNode(true);
    decorateMediaText(mediaText);
    return { media: mediaText, text: null, isTextFallback: true };
  }

  return { media: null, text, isTextFallback: false };
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

  const isVideo = block.classList.contains('video');
  const rows = getPartnerRows(block);
  if (!rows.length) return;

  const partners = rows.map((row) => {
    const { media, content, selector } = getPartnerColumns(row);
    const text = content?.cloneNode(true);
    if (text) decorateContent(text);
    const { media: mediaContent, text: panelText, isTextFallback } = preparePartnerMedia(media, text, selector);
    console.log("isTextFallback", isTextFallback);
    const selectorParagraphs = [...selector?.children || []].filter((el) => el.tagName === 'P');
    console.log("selectorParagraphs", selectorParagraphs);
    return {
      media: mediaContent,
      text: panelText,
      isTextFallback,
      label: selectorParagraphs.length ? selectorParagraphs[1]?.textContent?.trim() : selector.textContent?.trim(),
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
    if (partner.media) {
      if (partner.isTextFallback) partner.media.classList.add('partner-showcase-media-text');
      mediaPanel.append(partner.media);
    }
    feature.append(mediaPanel);

    const contentPanel = createTag('div', { class: 'partner-showcase-content-panel' });
    if (index === 0) contentPanel.classList.add('active');
    if (partner.isTextFallback) contentPanel.classList.add('is-media-fallback');
    if (partner.text) contentPanel.append(partner.text);
    contentArea.append(contentPanel);
  });

  const setActive = (index) => {
    feature.querySelectorAll('.partner-showcase-media-panel').forEach((panel, i) => {
      panel.classList.toggle('active', i === index);
    });
    contentArea.querySelectorAll('.partner-showcase-content-panel').forEach((panel, i) => {
      panel.classList.toggle('active', i === index);
    });
    nav.querySelectorAll('.partner-showcase-nav-item').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
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
  if (isVideo) media.classList.add('has-video');
  if (partners.some((partner) => partner.isTextFallback)) {
    inner.classList.add('has-text-fallback');
  }
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
