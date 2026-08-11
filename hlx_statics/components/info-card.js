import { createTag, removeEmptyPTags, decorateButtons } from '../scripts/lib-adobeio.js';
import {
  createOptimizedPicture,
  getMetadata,
  IS_DEV_DOCS,
} from '../scripts/lib-helix.js';
import {
  applyVideoContainer,
  getVideoTitle,
  parseVideoSource,
} from '../scripts/video.js';

function initializeNavigation(block, ul) {
  const cards = [...ul.children];
  if (cards.length <= 3) return;

  block.querySelectorAll('.info-card-nav').forEach((btn) => btn.remove());
  block.querySelectorAll('.info-card-viewport').forEach((el) => {
    el.replaceWith(...el.childNodes);
  });
  block.querySelectorAll('.info-card-carousel-nav').forEach((el) => el.remove());

  const createNav = (direction, path) => {
    const btn = createTag('button', {
      class: `info-card-nav info-card-nav-${direction}`,
      'aria-label': direction === 'prev' ? 'Previous' : 'Next',
    });

    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" width="16" height="16">
      <path d="${path}" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    return btn;
  };

  const prevBtn = createNav('prev', 'M15 18L9 12L15 6');
  const nextBtn = createNav('next', 'M9 18L15 12L9 6');

  const viewport = createTag('div', { class: 'info-card-viewport' });
  const navWrapper = createTag('div', { class: 'info-card-carousel-nav' });

  ul.parentNode.insertBefore(navWrapper, ul);
  viewport.appendChild(ul);
  navWrapper.appendChild(prevBtn);
  navWrapper.appendChild(viewport);
  navWrapper.appendChild(nextBtn);

  const getVisibleCount = () => {
    if (window.innerWidth <= 1024) {
      return 1;
    }
    return IS_DEV_DOCS ? 2 : 3;
  };

  let visible = getVisibleCount();
  let index = 0;
  let rafId = null;

  const getMaxIndex = () => Math.max(0, cards.length - visible);

  const update = () => {
    const maxIndex = getMaxIndex();
    index = Math.min(index, maxIndex);
    const shown = cards.slice(index, index + visible);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    cards.forEach((card) => {
      card.classList.add('hide');
      card.style.display = 'none';
    });

    rafId = requestAnimationFrame(() => {
      shown.forEach((card) => {
        card.style.display = '';
      });
      requestAnimationFrame(() => {
        shown.forEach((card) => card.classList.remove('hide'));
      });
      rafId = null;
    });

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index >= maxIndex;
  };

  const syncGridToVisible = () => {
    ul.style.setProperty('--info-card-visible', visible);
  };

  const changeIndex = (step) => {
    const maxIndex = getMaxIndex();
    index = Math.max(0, Math.min(index + step, maxIndex));
    update();
  };

  prevBtn.onclick = () => changeIndex(-1);
  nextBtn.onclick = () => changeIndex(1);

  let resizeRaf = null;
  const handleResize = () => {
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      const newVisible = getVisibleCount();
      if (newVisible !== visible) {
        visible = newVisible;
        index = Math.min(index, getMaxIndex());
        syncGridToVisible();
        update();
      }
    });
  };

  if (block._infoCardResizeHandler) {
    window.removeEventListener('resize', block._infoCardResizeHandler);
  }
  block._infoCardResizeHandler = handleResize;
  window.addEventListener('resize', handleResize);

  syncGridToVisible();
  update();
}

/** @param {Document} doc */
function getOpenGraphMeta(doc) {
  const m = (p) => doc.querySelector(`meta[property="${p}"]`)?.getAttribute('content')?.trim() || '';
  return {
    title: m('og:title') || doc.querySelector('title')?.textContent?.trim() || '',
    image: m('og:image') || m('og:image:secure_url'),
    description: m('og:description') || doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '',
  };
}

/** One block row per http(s) link so each URL gets a card. */
function splitArticleRowsOneLinkEach(block) {
  for (const row of [...block.children]) {
    const links = [...row.querySelectorAll(':scope a[href]')].filter((a) => {
      try { return ['http:', 'https:'].includes(new URL(a.href).protocol); } catch { return false; }
    });
    if (links.length < 2) continue;
    links.forEach((link) => {
      const wrap = document.createElement('div');
      wrap.appendChild(link);
      row.parentNode.insertBefore(wrap, row);
    });
    row.remove();
  }
}

/**
 * Shared info-card decoration — used by DevBiz (`info-card` block) and DevDocs (`infocard` block).
 * @param {Element} block
 * @param {{ daaLh?: string }} [options]
 */
export default async function decorateInfoCard(block, options = {}) {
  const { daaLh = 'info-card' } = options;
  block.setAttribute('daa-lh', daaLh);
  const isArticles = block.getAttribute('data-slots')?.split(',')?.includes('articles');
  const isVideoCard = block.classList.contains('video') || block.getAttribute('data-slots')?.split(',')?.includes('video');
  const isControls = block.classList.contains('controls') || block.getAttribute('data-controls') === 'true';
  const isNavigation = block.classList.contains('navigation') || block.getAttribute('data-navigation') === 'true';
  const isReverse = block.classList.contains('reverse') || block.getAttribute('data-reverse') === 'true';
  const isWide = block.getAttribute('data-wide') === 'true';
  const isCompact = block.classList.contains('compact') || block.getAttribute('data-compact') === 'true';
  if (isWide) {
    block.classList.add('wide');
  }
  if (isNavigation && IS_DEV_DOCS) {
    block.classList.add('navigation');
  }
  if (isReverse && IS_DEV_DOCS) {
    block.classList.add('reverse');
  }
  if (isCompact && IS_DEV_DOCS) {
    block.classList.add('compact');
  }
  removeEmptyPTags(block);

  if (block.classList.contains('articles') || isArticles) {
    splitArticleRowsOneLinkEach(block);
    await Promise.all([...block.children].map(async (row) => {
      const link = row.querySelector('a[href]');
      if (!link) return;
      const url = link.href;
      const fb = link.textContent.trim();
      try {
        const r = await fetch(url, { credentials: 'omit' });
        if (!r?.ok) return;
        const { title, image, description } = getOpenGraphMeta(new DOMParser().parseFromString(await r.text(), 'text/html'));
        const t = title || fb;
        row.replaceChildren();
        if (image) row.appendChild(createOptimizedPicture(image, t, false));
        const h3 = document.createElement('h3');
        h3.appendChild(Object.assign(createTag('a', { href: url }), { textContent: t }));
        row.appendChild(h3);
        if (description) row.appendChild(Object.assign(document.createElement('p'), { textContent: description }));
      } catch (e) {
        console.warn(`[${daaLh}] article fetch failed, keeping original row:`, e);
      }
    }));
  }

  let containerParent;
  if (block.classList.contains('primarybutton')) {
    const primaryButton = block.querySelectorAll('a')[0];
    const up = primaryButton.parentElement;
    const container = createTag('p', { class: 'button-container' });
    containerParent = primaryButton.parentElement.parentElement.parentElement;
    containerParent.appendChild(container);
    container.appendChild(up);
    if (!primaryButton.querySelector('img')) {
      if (up.childNodes.length === 1 && up.tagName === 'STRONG') {
        primaryButton.className = 'button primary';
      }
    }
    decorateButtons(containerParent);
  }
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const videoSource = isVideoCard ? parseVideoSource(row) : null;
    const cardHref = [...row.querySelectorAll('a[href]')].find((l) => l !== videoSource?.anchor)?.href;
    const card = createTag(cardHref ? 'a' : 'div', cardHref ? { href: cardHref } : {});

    const image = row.querySelector('img') || row.querySelector('picture img');

    if (image) {
      const imageDiv = createTag('div', { class: 'cards-card-image' });
      const picWidth = image.naturalWidth > 0 ? String(image.naturalWidth) : '1200';
      imageDiv.appendChild(
        createOptimizedPicture(image.src, image.alt, false, [{ width: picWidth }]),
      );
      card.appendChild(imageDiv);
    } else if (videoSource) {
      const imageDiv = createTag('div', { class: 'cards-card-image' });
      const wrapperVideo = createTag('div');
      applyVideoContainer(wrapperVideo, {
        url: videoSource.url,
        title: getVideoTitle(videoSource.url, videoSource.linkText),
        autoplay: true,
        muted: true,
        loop: true,
        controls: isControls ? true : false,
      });
      imageDiv.appendChild(wrapperVideo);
      card.appendChild(imageDiv);
    }

    const textDiv = createTag('div', { class: 'cards-card-body' });

    const headingElement = row.querySelector('h1, h2, h3, h4, h5, h6') || row.querySelector('a');
    if (headingElement) {
      const anchorHref = row.querySelector('a');
      if (anchorHref) {
        const h3 = document.createElement('h3');
        h3.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS', 'card-heading');
        h3.textContent = headingElement.textContent.trim();
        textDiv.appendChild(h3);
      } else {
        headingElement.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS', 'card-heading');
        textDiv.appendChild(headingElement);
      }
    }

    const description = row.querySelector('p')
      || row.querySelector('.info-card > div > div:last-child')
      || row.querySelector('.infocard > div > div:last-child');
    if (description && description.textContent.trim() !== '') {
      const p = document.createElement('p');
      p.style.color = 'rgb(110, 110, 110)';
      p.innerHTML = description.innerHTML;
      textDiv.appendChild(p);
    }

    card.appendChild(textDiv);
    li.appendChild(card);
    ul.appendChild(li);
  });

  block.textContent = '';
  block.appendChild(ul);
  if (isNavigation) {
    initializeNavigation(block, ul);
  }

  block.querySelectorAll('.icon').forEach((s) => {
    const p_parent = s.parentElement;
    const div_parent = createTag('div', { class: 'icon-div' });
    p_parent.classList.add('icon-p');
    p_parent.parentElement.appendChild(div_parent);
    div_parent.appendChild(p_parent);
  });

  if (block.classList.contains('primarybutton')) {
    block.appendChild(containerParent);
  }
}
