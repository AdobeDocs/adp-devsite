/*
 * Embed Block
 * Show videos and social posts directly on your page
 * https://www.hlx.live/developer/block-collection/embed
 */
import { decorateLightOrDark } from '../../scripts/lib-helix.js';
import {
  getVideoTitle,
  parseVideoSource,
  resolveVideoUrl,
} from '../../scripts/video.js';

/**
 * YouTube IFrame embed: for a *single* video, `loop=1` only works together with
 * `playlist=<same video id>`; otherwise the player does not repeat at the end.
 * @param {number} loop
 * @param {string} [videoId]
 */
const youtubeLoopQuery = (loop, videoId) =>
  loop && videoId ? `&playlist=${encodeURIComponent(videoId)}` : '';

const loadScript = (url, callback, type) => {
  const head = document.querySelector('head');
  const script = document.createElement('script');
  script.src = url;
  if (type) {
    script.setAttribute('type', type);
  }
  script.onload = callback;
  head.append(script);
  return script;
};

const getDefaultEmbed = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const params = [];
  if (loop) params.push('loop=1');
  if (controls) params.push('controls=1');
  if (autoplay) {
    params.push('autoplay=1');
    params.push('mute=1');
  }
  const query = params.length ? `?${params.join('&')}` : '';
  const titleAttr = `title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}"`;
  const embedHTML = `<div style="left: 0; width: 55vw; height: 45vh; max-height: fit-content; position: relative; padding-bottom: 56.25%;">
    <iframe src="${url.href}${query}" 
    style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen
      scrolling="no" allow="encrypted-media" ${titleAttr} loading="lazy">
    </iframe>
  </div>`;
  return embedHTML;
};

const embedIG = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const link = url.href.split('?')[0] + 'embed/captioned';
  const embedHTML = `<div class="igReel">
  <iframe src="${link}?autoplay=${autoplay}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen
    scrolling="no" allow="encrypted-media" title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}" loading="lazy">
  </iframe>
</div>`;
loadScript("https://www.instagram.com/embed.js");
return embedHTML;
};

const embedYTShort = (url, loop, controls, vidTitle, autoplay) => {
  const [, videoCode] = url.pathname.split('/shorts/');
  const mute = autoplay ? '&mute=1' : '';
  const loopQs = youtubeLoopQuery(loop, videoCode);
  return `<div class="ytShort">
  <iframe 
    src="https://www.youtube.com/embed/${videoCode}?rel=0&modestbranding=1&loop=${loop}&controls=${controls}&autoplay=${autoplay}${mute}${loopQs}"
    style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute; border-radius: 10px;"
    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    ${vidTitle ? `title="${vidTitle}"` : `title="Content from YouTube"`}
    loading="lazy">
  </iframe>
</div>`;
};

const embedMP4 = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const href = url instanceof URL ? url.href : String(url);
  const autoplayMute = autoplay ? 'autoplay muted playsinline' : '';
  const titleAttr = vidTitle ? `title="${vidTitle}" aria-label="${vidTitle}"` : '';
  const video = `
<div style=" width: 100%;">
      <video src="${href}" ${titleAttr} ${loop ? 'loop' : ''} ${controls ? 'controls' : ''} ${autoplayMute} style="width: 100%; height: 100%;">
      <p>Sorry, We're having an internal Error. Please try Again Soon!</p>
      </video>
</div>
  `;
  return video;
};
const embedYTPlaylist = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const listId = url.searchParams.get('list');
  const params = new URLSearchParams({ list: listId || '' });
  params.set('loop', String(loop));
  params.set('controls', String(controls));
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  const src = `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
  const embedHTML = `<div style="left: 0; width: 100%; height: 100%; position: relative; padding-bottom: 56.25%;">
  <iframe
  style="opacity: 1" src="${src}" data-src="${src}" allow="encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen
  title="${vidTitle ? vidTitle : 'Content from YouTube'}" scrolling="no">
   </iframe>
  </div>`;
  return embedHTML;
};
const embedTikTok = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const [, vidID] = url.pathname.split('video/')
  return `<div style="left: 0; width: 325px; height: 736px;  position: relative;">
    <iframe src="https://www.tiktok.com/embed/${vidID}?autoplay=${autoplay}" style="border: 0; top: 0; left: 0; width: 100%; height: 736px; position: absolute;" allowfullscreen
      scrolling="no" allow="accelerometer encrypted-media" title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}" loading="lazy">
    </iframe>
  </div>`;
}

const embedYoutube = (url, loop, controls, vidTitle, isShort, autoplay) => {
  let vid;
  const embed = url.pathname;

  if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
    const usp = new URLSearchParams(url.search);
    vid = usp.get('v') || (embed.includes('embed') && embed.split('/')[2]);
  }

  if (url.hostname === 'youtu.be') {
    vid = embed.split('/')[1];
  }
  if (embed.includes('shorts')) {
    return embedYTShort(url, loop, controls, vidTitle, autoplay);
  }
  if (embed.includes('playlist')) {
    return embedYTPlaylist(url, loop, controls, vidTitle, isShort, autoplay  );
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
        ${vidTitle ? `title="${vidTitle}"` : `title="Content from YouTube"`}
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
          scrolling="no" ${vidTitle ? `title="${vidTitle}"` : `title="Content from YouTube"`} loading="lazy">
        </iframe>
      </div>
    `;
  }

  return null;
};

const embedVimeo = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const [, video] = url.pathname.split('/');
  const muted = autoplay ? '&muted=1' : '';
  const embedHTML = `<div style="left: 0; width: 100%; height: 100%; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}?loop=${loop}&controls=${controls}&autoplay=${autoplay}${muted}" 
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="fullscreen; encrypted-media; accelerometer; gyroscope; picture-in-picture"  
      allowfullscreen
      title="${vidTitle ? vidTitle : `Content from ${url.hostname}`}" loading="lazy"></iframe>
    </div>`;
  return embedHTML;
};
const embedTwitter = (url, loop, controls, vidTitle, isShort, autoplay) => {
  const source = url.protocol + "//twitter.com" + url.pathname + (url.search ? url.search : "");
  const embedHTML = `<blockquote class="twitter-tweet"><a href="${source}?autoplay=${autoplay}"></a></blockquote>`;
  loadScript('https://platform.twitter.com/widgets.js');
  return embedHTML;
};


const loadEmbed = (block, link, linkText) => {
  if (block.classList.contains('embed-is-loaded')) {
    return;
  }
  decorateLightOrDark(block, true);
  const EMBEDS_CONFIG = [
    {
      match: ['youtube', 'youtu.be'],
      embed: embedYoutube,
    },
    {
      match: ['vimeo'],
      embed: embedVimeo,
    },
    {
      match: ['twitter', 'x.com'],
      embed: embedTwitter,
    },
    {
      match: ['insta'],
      embed: embedIG,
    },
    {
      match: ['tiktok'],
      embed: embedTikTok,
    },
    {
      match: ['mp4'],
      embed: embedMP4,
    },
  ];
  const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => link.includes(match)));
  // Initially set so that looping does not occur, but user can view the controls
  let loop = 0;
  let controls = 1;
  let autoplay = 0;
  const vidTitle = getVideoTitle(
    link,
    linkText,
    block.getAttribute('data-videotitle'),
  );
  const isShort = block.getAttribute('data-short')?.toLowerCase() === 'true';
  // changes the values based on metadata on this block or an ancestor section
  if (block.getAttribute('data-loop') === 'true' || block.classList.contains('loop')) {
    loop = 1;
  }
  if (block.getAttribute('data-nocontrols') === 'true' || block.classList.contains('nocontrols')) {
    controls = 0;
  }
  if (block.getAttribute('data-autoplay') === 'true' || block.classList.contains('autoplay')) {
    autoplay = 1;
  }
  if (controls === 0 ) {
    autoplay = 1;
  }
  const resolvedLink = resolveVideoUrl(link);
  const url = new URL(resolvedLink);
  if (config) {
    block.innerHTML = config.embed(url, loop, controls, vidTitle, isShort, autoplay);
    block.classList.add('block', 'embed', `embed-${config.match[0]}`);
  } else {
    block.innerHTML = getDefaultEmbed(url, loop, controls, vidTitle, isShort, autoplay);
    block.classList.add('block', 'embed');
  }
  block.classList.add('embed-is-loaded');
  const videoListener = () => {
    const iframe = block.querySelector('iframe');
    if (!iframe.src) {
      iframe.src = iframe.getAttribute('data-src');
      iframe.onload = () => { iframe.style.opacity = 1; };
    }
    block.removeEventListener('mouseover', videoListener);
  };
  block.addEventListener('mouseover', videoListener);
  const wid = block?.parentElement?.parentElement?.getAttribute('data-width');
  if (wid) {
    block.classList.add('embed-custom-width');
    block.firstChild.firstChild.style.width = wid;
  }
};

const addImage = (placeholder, block, link, linkText) => {
  const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';
    wrapper.innerHTML = '<div class="embed-placeholder-play"><button type="button" title="Play"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => {
      loadEmbed(block, link, linkText);
    });
    block.append(wrapper);
};
export default function decorate(block) {
  const getParent = block.parentElement;
  block.setAttribute('daa-lh', 'embed');
  const placeholder = block.querySelector('picture');
  const videoSource = parseVideoSource(block);
  const link = videoSource?.href || videoSource?.url;
  const linkText = videoSource?.linkText;

  block.textContent = '';
  if (placeholder) {
    if (!(placeholder.alt)) placeholder.alt = "Content thumbnail";
    addImage(placeholder, block, link, linkText);
  }
  else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)){
        observer.disconnect();
        loadEmbed(block, link, linkText);
      }
    });
   observer.observe(block);
  }
}
