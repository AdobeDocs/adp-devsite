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

function isAnimatedGif(src) {
  try {
    const url = new URL(src, window.location.href);
    return url.pathname.toLowerCase().endsWith('.gif');
  } catch {
    return false;
  }
}

function optimizeImages(container) {
  container.querySelectorAll('picture > img').forEach((img) => {
    const pic = img.closest('picture');
    if (!pic || pic.dataset.optimized) return;
    if (isAnimatedGif(img.src)) return;
    const optimized = createOptimizedPicture(img.src, img.alt);
    optimized.dataset.optimized = 'true';
    pic.replaceWith(optimized);
  });
}

function ensureYoutubeJsApi(iframe) {
  const src = iframe.getAttribute('src');
  if (!src) return;
  const url = new URL(src, window.location.href);
  if (!/youtube(-nocookie)?\.com$/.test(url.hostname.replace(/^www\./, ''))) return;
  if (!url.searchParams.has('enablejsapi')) {
    url.searchParams.set('enablejsapi', '1');
    iframe.setAttribute('src', url.toString());
  }
}

function postYoutubeCommand(iframe, func) {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

function pauseIframeVideo(iframe) {
  postYoutubeCommand(iframe, 'pauseVideo');
  if (!iframe.dataset.logoShowcaseLoadBound) {
    iframe.dataset.logoShowcaseLoadBound = 'true';
    iframe.addEventListener('load', () => {
      if (iframe.dataset.logoShowcasePendingPause === 'true') postYoutubeCommand(iframe, 'pauseVideo');
    });
  }
  iframe.dataset.logoShowcasePendingPause = 'true';
}

function playIframeVideo(iframe) {
  iframe.dataset.logoShowcasePendingPause = 'false';
  postYoutubeCommand(iframe, 'playVideo');
}

function prepareMedia(mediaDiv, block) {
  if (!mediaDiv) return null;
  if (block.classList.contains('video')) {
    const videoSource = parseVideoSource(mediaDiv);
    if (videoSource) {
      const wrapper = createTag('div');
      const title = getVideoTitle(videoSource.url, videoSource.linkText);
      applyVideoContainer(wrapper, {
        url: videoSource.url,
        title,
        autoplay: true,
        muted: true,
        loop: true,
        controls: block.classList.contains('controls'),
      });
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', title || 'Video');
      wrapper.querySelectorAll('iframe').forEach((iframe) => ensureYoutubeJsApi(iframe));
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

function decorateTypography(container) {
  container.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => {
    heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'logo-showcase-heading');
    decorateAnchorLink(heading);
  });
  container.querySelectorAll('p').forEach((p) => { p.classList.add('spectrum-Body', 'spectrum-Body--sizeM') });
}

function preparePartnerMedia(mediaDiv, text, block) {
  if (hasVisualMedia(mediaDiv, block)) {
    return { media: prepareMedia(mediaDiv, block), text, isTextFallback: false };
  }
  if (mediaDiv?.textContent?.trim()) {
    const mediaText = mediaDiv.cloneNode(true);
    decorateTypography(mediaText);
    mediaText.classList.add('logo-showcase-media-text');
    return { media: mediaText, text, isTextFallback: true };
  }
  if (text?.textContent?.trim()) {
    const fallbackText = text.cloneNode(true);
    fallbackText.classList.add('logo-showcase-media-text');
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
  const nodes = childNodes.filter((n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim());

  if (links.length === 1 && nodes.length === 1 && (nodes[0] === link || nodes[0]?.contains?.(link))) {
    return true;
  }
  if (link !== links.at(-1)) return false;

  const linkIndex = childNodes.indexOf(link);
  return linkIndex > -1 && childNodes.slice(0, linkIndex).some((n) => n.nodeName === 'BR');
}

function decorateContent(content) {
  decorateTypography(content);
  const buttonGroup = createTag('div', { class: 'logo-showcase-button-container' });

  [...content.querySelectorAll('p')].forEach((paragraph) => {
    if (paragraph.classList.contains('button-container')) {
      buttonGroup.append(paragraph);
      return;
    }

    [...paragraph.querySelectorAll('a')].filter((link) => isCtaLink(link, paragraph)).forEach((link) => {
      const childNodes = [...paragraph.childNodes];
      childNodes.slice(0, childNodes.indexOf(link)).reverse().forEach((node) => {
        if (node.nodeName === 'BR' || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) node.remove();
      });
      const buttonParagraph = createTag('p', { class: 'button-container' });
      buttonParagraph.append(link.parentElement?.tagName === 'STRONG' ? link.parentElement : link);
      buttonGroup.append(buttonParagraph);
    });

    if (!paragraph.textContent.trim() && !paragraph.querySelector('img,picture')) paragraph.remove();
  });

  if (buttonGroup.childElementCount) content.append(buttonGroup);
  decorateButtons(content);
}

function getNavItemLabel(partner, index) {
  if (partner.label) {
    return partner.label;
  }
  const img = partner.logo?.querySelector('img');
  if (img?.alt) {
    return img.alt.trim();
  }
  return `Partner ${index + 1}`;
}

let logoShowcaseInstanceId = 0;

function buildTab(partner, index, idPrefix, onSelect) {
  const label = getNavItemLabel(partner, index);
  const item = createTag('button', {
    class: 'logo-showcase-nav-item',
    type: 'button',
    role: 'tab',
    id: `${idPrefix}-tab-${index}`,
    'aria-controls': `${idPrefix}-panel-${index}`,
    'aria-selected': index ? 'false' : 'true',
    tabindex: index ? '-1' : '0',
    'aria-label': label,
  });
  if (!index) item.classList.add('active');

  const logo = createTag('div', { class: 'logo-showcase-nav-logo' });
  if (partner.logo) logo.append(partner.logo);

  const name = createTag('span', { class: 'logo-showcase-nav-name spectrum-Body spectrum-Body--sizeM' });
  name.textContent = partner.label || '';

  if (partner.logo && partner.label) item.append(logo, name);
  else item.append(partner.logo ? logo : name);

  item.addEventListener('click', () => onSelect(index));
  return item;
}

function bindTablistKeyboard(tablist, activate) {
  tablist.addEventListener('keydown', (event) => {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
      event.preventDefault();
      activate(currentIndex);
      return;
    } else {
      return;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    activate(nextIndex);
  });
}

export default async function decorate(block) {
  block.setAttribute('daa-lh', 'logo-showcase');
  decorateLightOrDark(block);
  removeEmptyPTags(block);

  const isVideo = block.classList.contains('video');
  const rows = [...block.children].filter((child) => child.tagName === 'DIV');
  if (!rows.length) return;

  rows.forEach((row) => decorateLightOrDark(row));

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

  logoShowcaseInstanceId += 1;
  const idPrefix = `logo-showcase-${logoShowcaseInstanceId}`;

  const tablist = createTag('div', {
    class: 'logo-showcase-tablist',
    role: 'tablist',
    'aria-label': 'Partners',
  });

  const tabPanels = partners.map((partner, index) => {
    const panel = createTag('div', {
      class: 'logo-showcase-tabpanel',
      role: 'tabpanel',
      id: `${idPrefix}-panel-${index}`,
      'aria-labelledby': `${idPrefix}-tab-${index}`,
    });
    if (index) panel.hidden = true;

    const mediaPanel = createTag('div', { class: 'logo-showcase-media-panel' });
    if (isVideo) mediaPanel.classList.add('has-video');
    if (partner.isTextFallback) mediaPanel.classList.add('is-text-fallback');
    if (partner.media) mediaPanel.append(partner.media);

    const contentPanel = createTag('div', { class: 'logo-showcase-content-panel' });
    if (partner.isTextFallback && !partner.text) contentPanel.classList.add('is-empty');
    if (partner.text) contentPanel.append(partner.text);

    panel.append(mediaPanel, contentPanel);
    return panel;
  });

  tabPanels.forEach((panel, i) => {
    if (i === 0) return;
    panel.querySelectorAll('video').forEach((v) => v.pause?.());
    panel.querySelectorAll('iframe').forEach((iframe) => pauseIframeVideo(iframe));
  });

  const setActive = (index) => {
    tabPanels.forEach((panel, i) => {
      const becomingActive = i === index;
      panel.hidden = !becomingActive;
      panel.querySelectorAll('video').forEach((v) => {
        if (becomingActive) v.play?.().catch(() => { });
        else v.pause?.();
      });
      panel.querySelectorAll('iframe').forEach((iframe) => {
        if (becomingActive) playIframeVideo(iframe);
        else pauseIframeVideo(iframe);
      });
    });
    tablist.querySelectorAll('[role="tab"]').forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });
  };

  partners.forEach((partner, index) => { tablist.append(buildTab(partner, index, idPrefix, setActive)) });
  bindTablistKeyboard(tablist, setActive);

  block.replaceChildren(tablist, ...tabPanels);
  optimizeImages(block);
}