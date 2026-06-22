const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
const VIDEO_HOST_PATTERNS = [
  'youtube',
  'youtu.be',
  'vimeo',
  'video.tv.adobe.com',
  'tiktok',
  'instagram',
  'insta',
  'twitter',
  'x.com',
];

const loadedEmbedScripts = new Set();

/**
 * Loads a third-party embed script once.
 * @param {string} scriptUrl
 * @param {Function} [onLoad]
 */
export function loadEmbedScript(scriptUrl, onLoad) {
  if (loadedEmbedScripts.has(scriptUrl)) {
    onLoad?.();
    return;
  }
  loadedEmbedScripts.add(scriptUrl);
  const script = document.createElement('script');
  script.src = scriptUrl;
  script.async = true;
  script.onload = () => onLoad?.();
  document.head.append(script);
}

function getUrlObject(url) {
  return new URL(resolveVideoUrl(url), window.location.href);
}

function getUrlHostname(url) {
  try {
    return getUrlObject(url).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

export function isInstagramUrl(url) {
  const hostname = getUrlHostname(url);
  return hostname.includes('instagram') || hostname.includes('instagr');
}

export function isTwitterUrl(url) {
  const hostname = getUrlHostname(url);
  return hostname.includes('twitter.com') || hostname === 'x.com' || hostname.endsWith('.x.com');
}

export function isTikTokUrl(url) {
  return getUrlHostname(url).includes('tiktok');
}

/**
 * Initializes Twitter and Instagram widgets inside a container.
 * @param {Element} container
 */
export function hydrateSocialEmbeds(container) {
  if (!container) return;

  if (container.querySelector('.twitter-tweet')) {
    const hydrateTwitter = () => {
      window.twttr?.widgets?.load?.(container);
    };
    if (window.twttr?.widgets?.load) {
      hydrateTwitter();
    } else {
      loadEmbedScript('https://platform.twitter.com/widgets.js', hydrateTwitter);
    }
  }

  if (container.querySelector('.video-embed-instagram')) {
    const hydrateInstagram = () => {
      window.instgrm?.Embeds?.process?.();
    };
    if (window.instgrm?.Embeds?.process) {
      hydrateInstagram();
    } else {
      loadEmbedScript('https://www.instagram.com/embed.js', hydrateInstagram);
    }
  }
}

/**
 * Returns true when the href/path points to a known video host or file extension.
 * @param {string} href
 */
export function isVideoLink(href) {
  if (!href) return false;
  const lower = href.toLowerCase();
  if (VIDEO_EXTENSIONS.some((ext) => lower.includes(ext))) return true;
  return VIDEO_HOST_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Resolves a video path to an absolute URL using the same rules as image handling.
 * Absolute URLs are returned unchanged; relative paths resolve against the current page.
 * @param {string} path
 */
export function resolveVideoUrl(path) {
  if (!path) return path;

  const isAbsolute = path.indexOf('://') > 0 || path.indexOf('//') === 0;
  if (isAbsolute) return path;

  try {
    return new URL(path, window.location.href).href;
  } catch (e) {
    return path;
  }
}

/**
 * Returns true when link text is author-provided descriptive text rather than a raw URL.
 * @param {string} text
 * @param {string} url
 */
export function isDescriptiveLinkText(text, url) {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;
  if (trimmed === url) return false;

  const normalizedText = trimmed.replace(/\/$/, '');
  const normalizedUrl = (url || '').replace(/\/$/, '');
  if (normalizedText === normalizedUrl) return false;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) return false;
  if (/^\/[^\s]*\.(mp4|webm|ogg|mov|m4v)/i.test(trimmed)) return false;

  return true;
}

/**
 * Generates a fallback accessible title from a video URL.
 * @param {string} url
 */
export function generateVideoTitle(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    if (urlObj.hostname && urlObj.hostname !== window.location.hostname) {
      return `Content from ${urlObj.hostname}`;
    }
    const filename = urlObj.pathname.split('/').pop();
    if (filename) {
      const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      if (name) return name;
    }
  } catch (e) {
    // fall through to default
  }
  return 'Video';
}

/**
 * Extracts a YouTube video id from common URL formats.
 * @param {string} url
 */
export function getYoutubeVideoId(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.split('/').filter(Boolean)[0]?.split('?')[0] || null;
    }
    if (urlObj.hostname.includes('youtube')) {
      const fromQuery = urlObj.searchParams.get('v');
      if (fromQuery) return fromQuery;
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];
      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];
    }
  } catch (e) {
    // fall through
  }
  return null;
}

/**
 * Extracts an Adobe TV video id from common URL formats.
 * @param {string} url
 */
export function getAdobeTvVideoId(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    if (urlObj.hostname === 'video.tv.adobe.com') {
      const match = urlObj.pathname.match(/\/v\/(\d+)/);
      return match?.[1] || null;
    }
  } catch (e) {
    // fall through
  }
  return null;
}

/**
 * Returns true when the URL should render inside an iframe.
 * @param {string} url
 */
export function isEmbeddableUrl(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Builds a responsive iframe embed for external video hosts.
 * @param {string} url
 * @param {string} title
 * @param {string} [className]
 */
export function buildGenericIframeEmbed(url, title, className = 'video-embed-generic') {
  const resolvedUrl = resolveVideoUrl(url);
  const accessibilityAttrs = buildVideoAccessibilityAttrs(title);
  const isPortrait = className.includes('portrait') || className.includes('instagram') || className.includes('tiktok');
  const landscapeClass = isPortrait ? '' : 'video-embed-landscape';
  return `<div class="video-embed ${landscapeClass} ${className}">
    <iframe src="${escapeHtmlAttr(resolvedUrl)}" ${accessibilityAttrs}
      allow="autoplay; fullscreen; encrypted-media; accelerometer; gyroscope; picture-in-picture"
      allowfullscreen loading="lazy"></iframe>
  </div>`;
}

/**
 * Builds a responsive Adobe TV iframe embed.
 * @param {string} videoId
 * @param {string} title
 */
export function buildAdobeTvEmbed(videoId, title) {
  const src = `https://video.tv.adobe.com/v/${videoId}`;
  return buildGenericIframeEmbed(src, title, 'video-embed-adobe-tv');
}

/**
 * Returns true when the URL should render as a native video file element.
 * @param {string} url
 */
export function isFileVideo(url) {
  const resolved = resolveVideoUrl(url).toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => resolved.includes(ext));
}

/**
 * Builds a responsive YouTube iframe embed.
 * @param {string} videoId
 * @param {string} title
 * @param {Object} [options]
 */
export function buildYoutubeEmbed(videoId, title, {
  autoplay = false,
  loop = false,
  controls = true,
} = {}) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    controls: controls ? '1' : '0',
  });
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  const accessibilityAttrs = buildVideoAccessibilityAttrs(title);
  return `<div class="video-embed video-embed-landscape video-embed-youtube">
    <iframe src="${src}" ${accessibilityAttrs}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen loading="lazy"></iframe>
  </div>`;
}

/**
 * Builds a responsive Vimeo iframe embed.
 * @param {string} url
 * @param {string} title
 * @param {Object} [options]
 */
export function buildVimeoEmbed(url, title, {
  autoplay = false,
  loop = false,
  controls = true,
} = {}) {
  const urlObj = new URL(url, window.location.href);
  const videoId = urlObj.pathname.split('/').filter(Boolean).pop();
  const params = new URLSearchParams({
    loop: loop ? '1' : '0',
    controls: controls ? '1' : '0',
  });
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('muted', '1');
  }
  const src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
  const accessibilityAttrs = buildVideoAccessibilityAttrs(title);
  return `<div class="video-embed video-embed-landscape video-embed-vimeo">
    <iframe src="${src}" ${accessibilityAttrs}
      allow="autoplay; fullscreen; encrypted-media; accelerometer; gyroscope; picture-in-picture"
      allowfullscreen loading="lazy"></iframe>
  </div>`;
}

/**
 * Builds a responsive Instagram iframe embed.
 * @param {string} url
 * @param {string} title
 * @param {Object} [options]
 */
export function buildInstagramEmbed(url, title, { autoplay = false } = {}) {
  const urlObj = getUrlObject(url);
  const embedSrc = `${urlObj.href.split('?')[0]}embed/captioned?autoplay=${autoplay ? 1 : 0}`;
  const accessibilityAttrs = buildVideoAccessibilityAttrs(title);
  return `<div class="video-embed video-embed-instagram video-embed-portrait">
    <iframe src="${escapeHtmlAttr(embedSrc)}" ${accessibilityAttrs}
      allowfullscreen scrolling="no" allow="encrypted-media" loading="lazy"></iframe>
  </div>`;
}

/**
 * Builds a Twitter/X embed using the official widget markup.
 * @param {string} url
 * @param {string} title
 * @param {Object} [options]
 */
export function buildTwitterEmbed(url, title, { autoplay = false } = {}) {
  const urlObj = getUrlObject(url);
  const tweetUrl = `https://twitter.com${urlObj.pathname}${urlObj.search || ''}?autoplay=${autoplay ? 1 : 0}`;
  return `<div class="video-embed video-embed-twitter">
    <blockquote class="twitter-tweet"><a href="${escapeHtmlAttr(tweetUrl)}" aria-label="${escapeHtmlAttr(title)}"></a></blockquote>
  </div>`;
}

/**
 * Builds a responsive TikTok iframe embed.
 * @param {string} url
 * @param {string} title
 * @param {Object} [options]
 */
export function buildTikTokEmbed(url, title, { autoplay = false } = {}) {
  const urlObj = getUrlObject(url);
  const [, videoId] = urlObj.pathname.split('video/');
  const accessibilityAttrs = buildVideoAccessibilityAttrs(title);
  const src = videoId
    ? `https://www.tiktok.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}`
    : urlObj.href;
  return `<div class="video-embed video-embed-tiktok video-embed-portrait">
    <iframe src="${escapeHtmlAttr(src)}" ${accessibilityAttrs}
      allow="accelerometer; encrypted-media; autoplay" allowfullscreen
      scrolling="no" loading="lazy"></iframe>
  </div>`;
}

/**
 * Builds video markup for file-based or embeddable URLs (YouTube, Vimeo, etc.).
 * @param {Object} options
 */
export function buildVideoMarkup({
  url,
  title,
  autoplay = false,
  muted = false,
  loop = false,
  controls = false,
  playsinline = true,
  extraAttrs = '',
} = {}) {
  const resolvedUrl = resolveVideoUrl(url);
  const resolvedTitle = title || generateVideoTitle(resolvedUrl);

  const youtubeId = getYoutubeVideoId(resolvedUrl);
  if (youtubeId) {
    return buildYoutubeEmbed(youtubeId, resolvedTitle, { autoplay, loop, controls: controls || !autoplay });
  }

  if (resolvedUrl.toLowerCase().includes('vimeo')) {
    return buildVimeoEmbed(resolvedUrl, resolvedTitle, { autoplay, loop, controls: controls || !autoplay });
  }

  const adobeTvId = getAdobeTvVideoId(resolvedUrl);
  if (adobeTvId) {
    return buildAdobeTvEmbed(adobeTvId, resolvedTitle);
  }

  if (isInstagramUrl(resolvedUrl)) {
    return buildInstagramEmbed(resolvedUrl, resolvedTitle, { autoplay });
  }

  if (isTwitterUrl(resolvedUrl)) {
    return buildTwitterEmbed(resolvedUrl, resolvedTitle, { autoplay });
  }

  if (isTikTokUrl(resolvedUrl)) {
    return buildTikTokEmbed(resolvedUrl, resolvedTitle, { autoplay });
  }

  if (isFileVideo(resolvedUrl)) {
    return buildVideoTag({
      url: resolvedUrl,
      title: resolvedTitle,
      autoplay,
      muted,
      loop,
      controls,
      playsinline,
      extraAttrs,
    });
  }

  if (isEmbeddableUrl(resolvedUrl)) {
    return buildGenericIframeEmbed(resolvedUrl, resolvedTitle);
  }

  return buildVideoTag({
    url: resolvedUrl,
    title: resolvedTitle,
    autoplay,
    muted,
    loop,
    controls,
    playsinline,
    extraAttrs,
  });
}

/**
 * Resolves the accessible title for a video.
 * Author-provided markdown link text takes precedence over metadata and generated values.
 * @param {string} url
 * @param {string} [linkText]
 * @param {string} [metadataTitle]
 */
export function getVideoTitle(url, linkText, metadataTitle) {
  if (isDescriptiveLinkText(linkText, url)) {
    return linkText.trim();
  }
  if (metadataTitle) {
    return metadataTitle;
  }
  return generateVideoTitle(url);
}

/**
 * Parses a video URL and optional author text from a container element or anchor.
 * Supports markdown-style links `[title](url)` and legacy raw URL text.
 * @param {Element|string} source
 */
export function parseVideoSource(source) {
  if (!source) return null;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return null;
    const url = resolveVideoUrl(trimmed);
    return {
      url,
      href: trimmed,
      linkText: trimmed,
      anchor: null,
    };
  }

  const anchor = source.tagName === 'A' ? source : source.querySelector?.('a');
  if (anchor?.href) {
    const href = anchor.getAttribute('href') || anchor.href;
    if (isVideoLink(href)) {
      const linkText = anchor.textContent?.trim() || '';
      return {
        url: resolveVideoUrl(href),
        href,
        linkText,
        anchor,
      };
    }
  }

  const videoParagraph = [...(source.querySelectorAll?.('p') || [])].find((p) => {
    if (p.querySelector('a')) return false;
    const text = p.textContent?.trim();
    return text && isVideoLink(text);
  });
  if (videoParagraph) {
    const text = videoParagraph.textContent.trim();
    return {
      url: resolveVideoUrl(text),
      href: text,
      linkText: text,
      anchor: null,
      sourceElement: videoParagraph,
    };
  }

  const rawContainer = source.querySelector?.(':scope > div > div') || source;
  const rawText = rawContainer?.textContent?.trim();
  if (rawText && isVideoLink(rawText)) {
    return {
      url: resolveVideoUrl(rawText),
      href: rawText,
      linkText: rawText,
      anchor: null,
    };
  }

  return null;
}

/**
 * Finds anchor elements within a container that reference video content.
 * @param {Element} container
 */
export function findVideoLinks(container) {
  if (!container) return [];
  return [...container.querySelectorAll('a')].filter((anchor) => {
    const href = anchor.getAttribute('href') || anchor.href;
    return isVideoLink(href);
  });
}

/**
 * Escapes a string for safe use in HTML attribute values.
 * @param {string} value
 */
export function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Builds title and aria-label attributes for accessible video markup.
 * @param {string} title
 */
export function buildVideoAccessibilityAttrs(title) {
  const escaped = escapeHtmlAttr(title);
  return `title="${escaped}" aria-label="${escaped}"`;
}

/**
 * Builds an HTML video element string with resolved URL and accessibility attributes.
 * @param {Object} options
 */
export function buildVideoTag({
  url,
  title,
  autoplay = false,
  muted = false,
  loop = false,
  controls = false,
  playsinline = true,
  extraAttrs = '',
} = {}) {
  const resolvedUrl = resolveVideoUrl(url);
  const resolvedTitle = title || generateVideoTitle(resolvedUrl);
  const accessibilityAttrs = buildVideoAccessibilityAttrs(resolvedTitle);
  const flags = [
    autoplay ? 'autoplay' : '',
    muted ? 'muted' : '',
    loop ? 'loop' : '',
    controls ? 'controls' : '',
    playsinline ? 'playsinline' : '',
    extraAttrs,
  ].filter(Boolean).join(' ');

  return `<div class="video-embed video-embed-landscape video-embed-file"><video src="${escapeHtmlAttr(resolvedUrl)}" ${accessibilityAttrs}${flags ? ` ${flags}` : ''}></video></div>`;
}

/**
 * Builds standardized video markup wrapped in a shared container.
 * @param {Object} options
 */
export function buildVideoContainer(options) {
  return `<div class="video-container">${buildVideoMarkup(options)}</div>`;
}

/**
 * Renders standardized video markup and hydrates social embed widgets.
 * @param {Element} element
 * @param {Object} options
 */
export function applyVideoContainer(element, options) {
  element.classList.add('video-container');
  element.innerHTML = buildVideoMarkup(options);
  hydrateSocialEmbeds(element);
}
