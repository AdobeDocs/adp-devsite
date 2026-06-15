const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
const VIDEO_HOST_PATTERNS = [
  'youtube',
  'youtu.be',
  'vimeo',
  'tiktok',
  'insta',
  'twitter',
  'x.com',
];

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
    const linkText = anchor.textContent?.trim() || '';
    return {
      url: resolveVideoUrl(href),
      href,
      linkText,
      anchor,
    };
  }

  const rawContainer = source.querySelector?.(':scope > div > div') || source;
  const rawText = rawContainer?.textContent?.trim();
  if (rawText && (isVideoLink(rawText) || /^https?:\/\//i.test(rawText) || rawText.startsWith('/'))) {
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

  return `<video src="${escapeHtmlAttr(resolvedUrl)}" ${accessibilityAttrs}${flags ? ` ${flags}` : ''}></video>`;
}
