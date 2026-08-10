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

  block.prepend(prevBtn);
  block.append(nextBtn);

  const getVisibleCount = () => {
    if (window.innerWidth <= 1024) {
      return 1;
    }
    return IS_DEV_DOCS ? 2 : 3;
  };

  let visible = getVisibleCount();
  let page = 0;
  let rafId = null;

  const update = () => {
    const maxPage = Math.ceil(cards.length / visible) - 1;
    const start = Math.min(page * visible, cards.length - visible);
    const shown = cards.slice(start, start + visible);
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
        positionArrows();
      });
      rafId = null;
    });

    prevBtn.disabled = page === 0;
    nextBtn.disabled = page >= maxPage;
  };

  const syncGridToVisible = () => {
    ul.style.setProperty('--info-card-visible', visible);
  };

  const ARROW_GAP = 12;

  const positionArrows = () => {
    const blockRect = block.getBoundingClientRect();
    const ulRect = ul.getBoundingClientRect();

    const leftOffset = Math.max(0, ulRect.left - blockRect.left - prevBtn.offsetWidth - ARROW_GAP);
    const rightOffset = Math.max(0, blockRect.right - ulRect.right - nextBtn.offsetWidth - ARROW_GAP);
    const topOffset = (ulRect.top - blockRect.top) + (ulRect.height / 2);

    prevBtn.style.left = `${leftOffset}px`;
    nextBtn.style.right = `${rightOffset}px`;
    prevBtn.style.top = `${topOffset}px`;
    nextBtn.style.top = `${topOffset}px`;
  };

  const changePage = (step) => {
    const maxPage = Math.ceil(cards.length / visible) - 1;
    page = Math.max(0, Math.min(page + step, maxPage));
    update();
  };

  prevBtn.onclick = () => changePage(-1);
  nextBtn.onclick = () => changePage(1);

  let resizeRaf = null;
  const handleResize = () => {
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      const newVisible = getVisibleCount();
      if (newVisible !== visible) {
        visible = newVisible;
        page = 0;
        syncGridToVisible();
        update();
      } else {
        positionArrows();
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
