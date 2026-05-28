import {
  decorateButtons,
} from '../../scripts/lib-adobeio.js';
import {
  buildFlatYouTubeIframeHtml,
  getVideoProvider,
  isDirectVideoUrl,
  isVideoAnchor,
  renderEmbedContent,
  resolveVideoUrl,
} from '../../components/video-embed-utils.js';

function rearrangeLinks(block) {
  const contentDiv = block.firstElementChild.querySelectorAll('div:has(p)');
  const textLinkContainer = document.createElement('div');
  textLinkContainer.classList.add('link-list-container');
  const contentContainer = document.createElement('div');
  contentContainer.classList.add('contentContainer');
  contentDiv.forEach((div) => {
    div.querySelectorAll('p:has(.text-block-link)').forEach((p) => {
      textLinkContainer.append(p);
    });
    div.append(textLinkContainer);
    contentContainer.append(div);
  });
  block.firstElementChild.append(contentContainer);
}

function mountTextBlockVideo(anchor) {
  const urlString = resolveVideoUrl(anchor);
  if (!urlString) return;

  const url = new URL(urlString, window.location.href);
  const title = anchor.textContent?.trim() || 'Video content';
  const slot = document.createElement('div');
  slot.classList.add('text-video-slot');

  const provider = getVideoProvider(url);
  if (provider === 'youtube') {
    slot.classList.add('embed-youtube');
    slot.innerHTML = buildFlatYouTubeIframeHtml(url, title, false);
  } else if (isDirectVideoUrl(url)) {
    slot.innerHTML = `<video controls loading="lazy" preload="metadata" playsinline>
      <source src="${url.href}" />
    </video>`;
  } else {
    const rendered = renderEmbedContent(url, {
      loop: 0,
      controls: 1,
      autoplay: 0,
      includeDefault: true,
      vidTitle: title,
    });
    if (!rendered?.html) return;
    slot.innerHTML = rendered.html;
    if (rendered.className) {
      slot.classList.add(rendered.className);
    }
  }

  const container = anchor.closest('p') || anchor.parentElement;
  container?.replaceWith(slot);
}

function processTextBlockVideos(block) {
  block.querySelectorAll('a').forEach((anchor) => {
    if (anchor.closest('.text-video-slot')) return;
    if (!isVideoAnchor(anchor)) return;
    mountTextBlockVideo(anchor);
  });
}

function rearrangeButtons(block) {
  const contentDiv = block.firstElementChild.querySelectorAll('div:has(p)');
  const textButtonContainer = document.createElement('div');
  textButtonContainer.classList.add('text-button-container');
  const contentContainer = document.createElement('div');
  contentContainer.classList.add('contentContainer');
  contentDiv.forEach((div) => {
    div.querySelectorAll('p.button-container').forEach((p) => {
      textButtonContainer.append(p);
    });
    div.append(textButtonContainer);
    contentContainer.append(div);
  });
  block.firstElementChild.append(contentContainer);
}

function hasTextBlockMedia(block) {
  return Boolean(
    block.querySelector('.text-video-slot')
      || block.querySelector('p.button-container'),
  );
}

/**
 * decorates the text
 * @param {*} block The text block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'text');

  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL');
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
  });
  block.querySelectorAll('p a').forEach((p) => {
    p.classList.add('text-block-link');
  });
  block.querySelectorAll('p a:first-child').forEach((p) => {
    p.style.borderWidth = '2px';
  });
  block.querySelectorAll('img').forEach((img) => {
    img.classList.add('textImg');
  });

  decorateButtons(block);
  processTextBlockVideos(block);

  const isImageTextBlock = !hasTextBlockMedia(block);
  if (isImageTextBlock) {
    rearrangeLinks(block);
  } else {
    rearrangeButtons(block);
    document.querySelectorAll('.text .contentContainer').forEach((contentContainer) => {
      const firstChild = contentContainer.firstElementChild?.firstElementChild;
      if (!firstChild || firstChild.tagName.toLowerCase() !== 'p') return;

      const contentContainerElements = contentContainer.firstElementChild.children;
      const newDiv = document.createElement('div');
      newDiv.classList.add('headIconContainer');
      for (let i = 0; i < contentContainerElements.length; i += 1) {
        if (contentContainerElements[i].tagName.toLowerCase() === 'p') {
          if (newDiv.children.length > 0) {
            const spliterDiv = document.createElement('div');
            spliterDiv.classList.add('spliterDiv');
            newDiv.append(spliterDiv);
          }
          newDiv.append(contentContainerElements[i]);
          i -= 1;
        } else {
          break;
        }
      }
      contentContainer.firstElementChild.insertBefore(newDiv, contentContainerElements[0]);
    });
  }
}
