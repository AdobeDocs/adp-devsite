function toUrl(linkOrUrl) {
  if (linkOrUrl instanceof URL) return linkOrUrl;
  return new URL(linkOrUrl, window.location.href);
}

export function isDirectVideoUrl(linkOrUrl) {
  const url = toUrl(linkOrUrl);
  const path = url.pathname.toLowerCase();
  return /\.(mp4|webm|ogg)(?:$|[?#])/i.test(path);
}

export function getYouTubeEmbedUrl(linkOrUrl) {
  const url = toUrl(linkOrUrl);
  const host = url.hostname.toLowerCase();
  const isYouTubeHost = host === 'youtu.be'
    || host === 'm.youtube.com'
    || host.endsWith('youtube.com');

  if (!isYouTubeHost) return null;

  let videoId = '';
  const path = url.pathname;

  if (host === 'youtu.be') {
    videoId = path.split('/').filter(Boolean)[0] || '';
  } else if (path.includes('/shorts/')) {
    videoId = path.split('/shorts/')[1]?.split('/')[0] || '';
  } else if (path.includes('/embed/')) {
    videoId = path.split('/embed/')[1]?.split('/')[0] || '';
  } else {
    videoId = url.searchParams.get('v') || '';
  }

  const listId = url.searchParams.get('list');

  if (!videoId && listId) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}`;
  }

  if (!videoId) return null;

  const params = new URLSearchParams();
  if (listId) params.set('list', listId);
  const query = params.toString();
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}${query ? `?${query}` : ''}`;
}

export function getEmbeddableVideoUrl(linkOrUrl) {
  const url = toUrl(linkOrUrl);
  return getYouTubeEmbedUrl(url) || url.href;
}

const VIDEO_URL_PATTERN = /(?:youtube\.com|youtu\.be|video\.tv\.adobe\.com|vimeo\.com|tiktok\.com|instagram\.com|twitter\.com|x\.com|\.mp4(?:$|\?|&))/i;

export function isVideoUrl(linkOrUrl) {
  if (!linkOrUrl) return false;
  try {
    return VIDEO_URL_PATTERN.test(String(linkOrUrl));
  } catch {
    return false;
  }
}

export function resolveVideoUrl(anchor) {
  if (!anchor) return null;
  const candidates = [
    anchor.textContent?.trim(),
    anchor.getAttribute('title'),
    anchor.href,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const httpsMatch = String(candidate).match(/https?:\/\/[^\s"'<>]+/i);
    if (httpsMatch && isVideoUrl(httpsMatch[0])) {
      return httpsMatch[0].replace(/[.,;:!?)]+$/, '');
    }
    if (isVideoUrl(candidate)) {
      return candidate.startsWith('http')
        ? candidate
        : new URL(candidate, window.location.href).href;
    }
  }
  return null;
}

export function isVideoAnchor(anchor) {
  return Boolean(resolveVideoUrl(anchor));
}

/**
 * Resolves a video URL from an embed block (anchor or plain text in cells).
 * @param {Element} embedBlock
 * @returns {{ urlString: string, title: string }|null}
 */
export function resolveEmbedBlockVideo(embedBlock) {
  if (!embedBlock) return null;

  const anchor = embedBlock.querySelector('a');
  if (anchor) {
    const urlString = resolveVideoUrl(anchor);
    if (urlString) {
      return {
        urlString,
        title: anchor.textContent?.trim() || 'Video content',
      };
    }
  }

  const cell = embedBlock.querySelector(':scope > div > div');
  const text = cell?.textContent?.trim() || '';
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (match && isVideoUrl(match[0])) {
    return {
      urlString: match[0].replace(/[.,;:!?)]+$/, ''),
      title: 'Video content',
    };
  }

  return null;
}

export function getVideoProvider(linkOrUrl) {
  const url = toUrl(linkOrUrl);
  const host = url.hostname.toLowerCase();

  if (isDirectVideoUrl(url)) return 'mp4';
  if (host === 'youtu.be' || host === 'm.youtube.com' || host.endsWith('youtube.com')) {
    return 'youtube';
  }
  if (host.includes('vimeo.com')) return 'vimeo';
  if (host === 'x.com' || host.endsWith('twitter.com')) return 'twitter';
  if (host.includes('instagram.com')) return 'insta';
  if (host.includes('tiktok.com')) return 'tiktok';

  return null;
}

/**
 * YouTube IFrame embed: for a *single* video, `loop=1` only works together with
 * `playlist=<same video id>`; otherwise the player does not repeat at the end.
 * @param {number} loop
 * @param {string} [videoId]
 */
function youtubeLoopQuery(loop, videoId) {
  return loop && videoId ? `&playlist=${encodeURIComponent(videoId)}` : '';
}

function getDefaultEmbed(url, loop, controls, vidTitle, autoplay) {
  const params = [];
  if (loop) params.push('loop=1');
  if (controls) params.push('controls=1');
  if (autoplay) {
    params.push('autoplay=1');
    params.push('mute=1');
  }
  const query = params.length ? `?${params.join('&')}` : '';
  const titleAttr = `title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}"`;
  return `<div style="left: 0; width: 55vw; height: 45vh; max-height: fit-content; position: relative; padding-bottom: 56.25%;">
    <iframe src="${url.href}${query}"
    style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen
      scrolling="no" allow="encrypted-media" ${titleAttr} loading="lazy">
    </iframe>
  </div>`;
}

function embedIG(url, vidTitle, autoplay, loadScript) {
  const link = `${url.href.split('?')[0]}embed/captioned`;
  if (typeof loadScript === 'function') {
    loadScript('https://www.instagram.com/embed.js');
  }
  return `<div class="igReel">
  <iframe src="${link}?autoplay=${autoplay}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen
    scrolling="no" allow="encrypted-media" title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}" loading="lazy">
  </iframe>
</div>`;
}

function embedYTShort(url, loop, controls, vidTitle, autoplay) {
  const [, videoCode] = url.pathname.split('/shorts/');
  const mute = autoplay ? '&mute=1' : '';
  const loopQs = youtubeLoopQuery(loop, videoCode);
  return `<div class="ytShort">
  <iframe
    src="https://www.youtube.com/embed/${videoCode}?rel=0&modestbranding=1&loop=${loop}&controls=${controls}&autoplay=${autoplay}${mute}${loopQs}"
    style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; border-radius: 10px;"
    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    ${vidTitle ? `title="${vidTitle}"` : 'title="Content from YouTube"'}
    loading="lazy">
  </iframe>
</div>`;
}

function embedMP4(url, loop, controls, autoplay) {
  const autoplayMute = autoplay ? 'autoplay muted playsinline' : '';
  return `
<div style=" width: 100%;">
      <video src="${url.href}" ${loop ? 'loop' : ''} ${controls ? 'controls' : ''} ${autoplayMute} style="width: 100%; height: 100%;">
      Sorry, we're having an internal error. Please try again soon.
      </video>
</div>
  `;
}

function embedYTPlaylist(url, loop, controls, vidTitle, autoplay) {
  const listId = url.searchParams.get('list');
  const params = new URLSearchParams({ list: listId || '' });
  params.set('loop', String(loop));
  params.set('controls', String(controls));
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  const src = `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
  return `<div style="left: 0; width: 100%; height: 100%; position: relative; padding-bottom: 56.25%;">
  <iframe
  style="opacity: 1" src="${src}" data-src="${src}" allow="encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen
  title="${vidTitle ? vidTitle : 'Content from YouTube'}" scrolling="no">
   </iframe>
  </div>`;
}

function embedTikTok(url, vidTitle, autoplay) {
  const [, vidID] = url.pathname.split('video/');
  return `<div style="left: 0; width: 325px; height: 736px;  position: relative;">
    <iframe src="https://www.tiktok.com/embed/${vidID}?autoplay=${autoplay}" style="border: 0; top: 0; left: 0; width: 100%; height: 736px; position: absolute;" allowfullscreen
      scrolling="no" allow="accelerometer encrypted-media" title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}" loading="lazy">
    </iframe>
  </div>`;
}

function embedYoutube(url, loop, controls, vidTitle, isShort, autoplay) {
  let vid;
  const embedPath = url.pathname;
  const host = url.hostname.toLowerCase();

  if (host === 'www.youtube.com' || host === 'youtube.com') {
    const usp = new URLSearchParams(url.search);
    vid = usp.get('v') || (embedPath.includes('embed') && embedPath.split('/')[2]);
  }

  if (host === 'youtu.be') {
    vid = embedPath.split('/').filter(Boolean)[0]?.split('?')[0] || '';
  }
  if (embedPath.includes('shorts')) {
    return embedYTShort(url, loop, controls, vidTitle, autoplay);
  }
  if (embedPath.includes('playlist')) {
    return embedYTPlaylist(url, loop, controls, vidTitle, autoplay);
  }
  if (isShort && vid) {
    const mute = autoplay ? '&mute=1' : '';
    const loopQs = youtubeLoopQuery(loop, vid);
    return `<div class="ytShort">
      <iframe
        src="https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1&loop=${loop}&controls=${controls}&autoplay=${autoplay}${mute}${loopQs}"
        style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; border-radius: 10px;"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        ${vidTitle ? `title="${vidTitle}"` : 'title="Content from YouTube"'}
        loading="lazy">
      </iframe>
    </div>`;
  }

  if (vid) {
    const mute = autoplay ? '&mute=1' : '';
    const loopQs = youtubeLoopQuery(loop, vid);
    return `
      <div style="left: 0; width: 100%; height: 100%; position: relative; padding-bottom: 56.25%;">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${vid}?loop=${loop}&controls=${controls}&autoplay=${autoplay}${mute}${loopQs}"
          data-src="https://www.youtube-nocookie.com/embed/${vid}?loop=${loop}&controls=${controls}&autoplay=${autoplay}${mute}${loopQs}"
          allow="encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen
          scrolling="no" ${vidTitle ? `title="${vidTitle}"` : 'title="Content from YouTube"'} loading="lazy">
        </iframe>
      </div>
    `;
  }

  return null;
}

function embedVimeo(url, loop, controls, vidTitle, autoplay) {
  const [, video] = url.pathname.split('/');
  const muted = autoplay ? '&muted=1' : '';
  return `<div style="left: 0; width: 100%; height: 100%; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}?loop=${loop}&controls=${controls}&autoplay=${autoplay}${muted}"
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      frameborder="0" allow="fullscreen; encrypted-media; accelerometer; gyroscope; picture-in-picture"
      allowfullscreen
      title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}" loading="lazy"></iframe>
    </div>`;
}

function embedTwitter(url, vidTitle, autoplay, loadScript) {
  const source = `${url.protocol}//twitter.com${url.pathname}${url.search ? url.search : ''}`;
  if (typeof loadScript === 'function') {
    loadScript('https://platform.twitter.com/widgets.js');
  }
  return `<blockquote class="twitter-tweet"><a href="${source}?autoplay=${autoplay}"></a></blockquote>`;
}

/**
 * Flat YouTube iframe markup (same pattern as columns block).
 * @param {string|URL} linkOrUrl
 * @param {string} title
 * @param {boolean} autoplay
 * @returns {string}
 */
export function buildFlatYouTubeIframeHtml(linkOrUrl, title = 'Video content', autoplay = false) {
  const embedUrl = getYouTubeEmbedUrl(linkOrUrl);
  if (!embedUrl) return '';

  const queryIndex = embedUrl.indexOf('?');
  const base = queryIndex === -1 ? embedUrl : embedUrl.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : embedUrl.slice(queryIndex + 1));

  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }

  const query = params.toString();
  const src = query ? `${base}?${query}` : base;

  return `<iframe src="${src}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`;
}

export function buildCarouselVideoHtml(carouselBlock, url, title = 'Video content') {
  const autoPlay = carouselBlock?.classList?.contains('autoplay');
  const provider = getVideoProvider(url);

  if (provider === 'youtube') {
    return buildFlatYouTubeIframeHtml(url, title, autoPlay);
  }

  const rendered = renderEmbedContent(url, {
    loop: 0,
    controls: 1,
    autoplay: autoPlay ? 1 : 0,
    includeDefault: true,
    vidTitle: title,
  });

  if (rendered?.html) {
    return wrapCarouselVideoEmbed(rendered.html);
  }

  if (isDirectVideoUrl(url)) {
    return wrapCarouselVideoEmbed(
      `<video controls loading="lazy" ${autoPlay ? 'autoplay muted playsinline' : ''} preload="metadata" playsinline>
        <source src="${url.href}" />
      </video>`,
    );
  }

  return wrapCarouselVideoEmbed(
    `<iframe src="${url.href}" title="${title}" allowfullscreen loading="lazy"></iframe>`,
  );
}

/**
 * Mounts a video in a carousel slide media column.
 * @param {Element} carouselBlock
 * @param {Element} slideCell
 * @param {Element|null} container Node to remove after mount (embed block, paragraph, etc.)
 * @param {string} urlString
 */
export function mountCarouselVideo(
  carouselBlock,
  slideCell,
  container,
  urlString,
  title = 'Video content',
) {
  if (!slideCell || !urlString || slideCell.querySelector(':scope > .video-element')) return;
  try {
    const url = new URL(urlString, window.location.href);
    const provider = getVideoProvider(url);
    const videoElement = document.createElement('div');
    videoElement.className = 'video-element';
    if (provider === 'youtube') {
      videoElement.classList.add('embed-youtube');
    }
    const html = buildCarouselVideoHtml(carouselBlock, url, title);
    if (!html?.trim()) return;
    videoElement.innerHTML = html;
    slideCell.insertBefore(videoElement, slideCell.firstChild);
    container?.remove();
    const embedBlock = container?.classList?.contains('block')
      && container?.classList?.contains('embed')
      ? container
      : container?.closest?.('.embed.block');
    if (embedBlock) {
      embedBlock.classList.add('embed-is-loaded');
      embedBlock.dataset.carouselVideo = 'true';
    }
  } catch {
    // invalid URL — leave content unchanged
  }
}

export function wrapCarouselVideoEmbed(html) {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.innerHTML = html.trim();
  const iframe = temp.querySelector('iframe');
  const video = temp.querySelector('video');

  if (iframe) {
    const src = iframe.getAttribute('src') || iframe.getAttribute('data-src');
    if (src) {
      iframe.setAttribute('src', src);
      iframe.removeAttribute('data-src');
    }
    iframe.setAttribute('loading', 'lazy');
    return `<div class="carousel-video-embed">${iframe.outerHTML}</div>`;
  }

  if (video) {
    return `<div class="carousel-video-embed carousel-video-embed--mp4">${video.outerHTML}</div>`;
  }

  const inner = temp.querySelector(':scope > div') || temp.firstElementChild;
  if (inner) {
    return `<div class="carousel-video-embed">${inner.outerHTML}</div>`;
  }

  return `<div class="carousel-video-embed">${html}</div>`;
}

export function renderEmbedContent(linkOrUrl, options = {}) {
  const {
    loop = 0,
    controls = 1,
    vidTitle = '',
    isShort = false,
    autoplay = 0,
    includeDefault = true,
    loadScript,
  } = options;

  const url = toUrl(linkOrUrl);
  const provider = getVideoProvider(url);

  if (provider === 'youtube') {
    return {
      html: embedYoutube(url, loop, controls, vidTitle, isShort, autoplay),
      className: 'embed-youtube',
      provider,
    };
  }
  if (provider === 'vimeo') {
    return {
      html: embedVimeo(url, loop, controls, vidTitle, autoplay),
      className: 'embed-vimeo',
      provider,
    };
  }
  if (provider === 'twitter') {
    return {
      html: embedTwitter(url, vidTitle, autoplay, loadScript),
      className: 'embed-twitter',
      provider,
    };
  }
  if (provider === 'insta') {
    return {
      html: embedIG(url, vidTitle, autoplay, loadScript),
      className: 'embed-insta',
      provider,
    };
  }
  if (provider === 'tiktok') {
    return {
      html: embedTikTok(url, vidTitle, autoplay),
      className: 'embed-tiktok',
      provider,
    };
  }
  if (provider === 'mp4') {
    return {
      html: embedMP4(url, loop, controls, autoplay),
      className: 'embed-mp4',
      provider,
    };
  }

  if (!includeDefault) return null;

  return {
    html: getDefaultEmbed(url, loop, controls, vidTitle, autoplay),
    className: '',
    provider: null,
  };
}
