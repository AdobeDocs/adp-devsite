/*
 * Embed Block
 * Show videos and social posts directly on your page
 * https://www.hlx.live/developer/block-collection/embed
 */
import { decorateLightOrDark } from '../../scripts/lib-helix.js';
import {
  mountCarouselVideo,
  renderEmbedContent,
  resolveEmbedBlockVideo,
} from '../../components/video-embed-utils.js';

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

const loadEmbed = (block, link) => {
  if (block.classList.contains('embed-is-loaded')) {
    return;
  }
  decorateLightOrDark(block, true);
  // Initially set so that looping does not occur, but user can view the controls
  let loop = 0;
  let controls = 1;
  let autoplay = 0;
  const vidTitle = block.getAttribute(  'data-videotitle');
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
  const renderResult = renderEmbedContent(link, {
    loop,
    controls,
    vidTitle,
    isShort,
    autoplay,
    includeDefault: true,
    loadScript,
  });
  block.innerHTML = renderResult?.html || '';
  block.classList.add('block', 'embed');
  if (renderResult?.className) {
    block.classList.add(renderResult.className);
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

const addImage = (placeholder, block, link) => {
  const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';
    wrapper.innerHTML = '<div class="embed-placeholder-play"><button type="button" title="Play"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => {
      loadEmbed(block, link, true);
    });
    block.append(wrapper);
};
export default function decorate(block) {
  const carouselBlock = block.closest('.carousel');
  if (carouselBlock) {
    const slideCell = block.closest('.carousel-container');
    if (slideCell && !slideCell.querySelector(':scope > .video-element')) {
      const resolved = resolveEmbedBlockVideo(block);
      if (resolved) {
        mountCarouselVideo(
          carouselBlock,
          slideCell,
          block,
          resolved.urlString,
          resolved.title,
        );
      }
    }
    return;
  }
  const getParent = block.parentElement;
  block.setAttribute('daa-lh', 'embed');
  const placeholder = block.querySelector('picture');
  let link
  if (block.querySelector('a')?.href) {
    link = block.querySelector('a')?.href
  }
  else {
    link = block.querySelector('.embed > div > div').innerText;
  }

  block.textContent = '';
  if (placeholder) {
    if (!(placeholder.alt)) placeholder.alt = "Content thumbnail";
    addImage(placeholder, block, link);
  }
  else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)){
        observer.disconnect();
        loadEmbed(block, link);
      }
    });
   observer.observe(block);
  }
}
