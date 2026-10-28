import { createTag, getResourceUrl } from '../../scripts/lib-adobeio.js';

const DEFAULT_FEED_URL = 'https://raw.githubusercontent.com/AdobeDocs/cc-everywhere/refs/heads/main/src/pages/feed.xml';

const ALL_TYPES = [
  { key: 'Breaking', label: 'Breaking', icon: 'breaking' },
  { key: 'Removed', label: 'Removed', icon: 'removed' },
  { key: 'Deprecated', label: 'Deprecated', icon: 'deprecated' },
  { key: 'New', label: 'New', icon: 'new' },
  { key: 'Improved', label: 'Improved', icon: 'improved' },
  { key: 'Fixed', label: 'Fixed', icon: 'fixed' },
  { key: 'Docs', label: 'Docs', icon: 'docs' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Return inline SVG icons for change types and UI elements.
 */
function getIconSvg(type) {
  const icons = {
    breaking: '<svg class="changelog-type-icon icon-breaking" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="#D31510" d="M8 1l7 7-7 7-7-7z"/></svg>',
    removed: '<svg class="changelog-type-icon icon-removed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="#D31510" stroke-width="2" d="M8 2.5l5.5 5.5-5.5 5.5-5.5-5.5z"/></svg>',
    deprecated: '<svg class="changelog-type-icon icon-deprecated" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="#E68619" d="M8 2l7 12H1z"/></svg>',
    new: '<svg class="changelog-type-icon icon-new" viewBox="0 0 16 16" width="9" height="9" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="#0265DC"/></svg>',
    improved: '<svg class="changelog-type-icon icon-improved" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="#0265DC" stroke-width="2"/></svg>',
    fixed: '<svg class="changelog-type-icon icon-fixed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.5 3.5 6.5-7"/></svg>',
    docs: '<svg class="changelog-type-icon icon-docs" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="#505050" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path fill="none" stroke="#505050" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 2v4h4"/></svg>',
    rss: '<svg class="changelog-rss-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3.75 3a1.5 1.5 0 0 0 0 3A14.25 14.25 0 0 1 18 20.25a1.5 1.5 0 0 0 3 0A17.25 17.25 0 0 0 3.75 3zm0 6a1.5 1.5 0 0 0 0 3 8.25 8.25 0 0 1 8.25 8.25a1.5 1.5 0 0 0 3 0A11.25 11.25 0 0 0 3.75 9zm0 6.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5z"/></svg>',
    chevron: '<svg class="changelog-chevron-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>',
  };
  return icons[type] || '';
}

/**
 * Format markdown inline code (`code`) into HTML <code> tags.
 */
function formatCodeChips(text) {
  return text ? text.replace(/`([^`]+)`/g, '<code>$1</code>') : '';
}

/**
 * Parses date string (RFC 822 pubDate, ISO YYYY-MM-DD, or formatted) into { year, monthNum, displayDate, rawDate }.
 */
function parseDate(dateStr, fallbackStr) {
  let str = (dateStr || '').trim();
  if (!str && fallbackStr) {
    const match = fallbackStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) str = match[1];
  }
  if (!str) return { year: '', monthNum: 0, displayDate: '', rawDate: '' };

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = String(parsed.getUTCFullYear());
    const m = parsed.getUTCMonth();
    const d = parsed.getUTCDate();
    return {
      year: y,
      monthNum: m + 1,
      displayDate: `${MONTH_ABBR[m]} ${d}, ${y}`,
      rawDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }

  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const mIdx = parseInt(m, 10) - 1;
    return {
      year: y,
      monthNum: parseInt(m, 10),
      displayDate: `${MONTH_ABBR[mIdx] || m} ${parseInt(d, 10)}, ${y}`,
      rawDate: `${y}-${m}-${d}`,
    };
  }

  const written = str.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (written) {
    const [, monthName, day, year] = written;
    const mIdx = MONTH_ABBR.findIndex((abbr) => monthName.startsWith(abbr));
    return {
      year,
      monthNum: mIdx >= 0 ? mIdx + 1 : 1,
      displayDate: `${monthName.slice(0, 3)} ${day}, ${year}`,
      rawDate: `${year}-${String(mIdx >= 0 ? mIdx + 1 : 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  }

  return { year: '', monthNum: 0, displayDate: str, rawDate: str };
}

/**
 * Dynamically extracts a module or component name from description text.
 */
function extractDynamicModule(htmlText) {
  if (!htmlText) return '';

  const colonMatch = htmlText.match(/^(?:<[^>]+>)*([a-zA-Z0-9_$. -]{2,45}):/);
  if (colonMatch) {
    let candidate = colonMatch[1].replace(/^\d+\.\s*/, '').replace(/^ccEverywhere\./i, '').trim();
    if (candidate.includes('.')) {
      const parts = candidate.split('.');
      candidate = parts.length > 2 ? `${parts[0]}.${parts[1]}` : parts[0];
    }
    const ignored = ['note', 'added', 'fixed', 'warning', 'important', 'tip', 'update', 'deprecated'];
    if (candidate && candidate.length <= 40 && !ignored.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  const prefixMatch = htmlText.match(/<code>(?:ccEverywhere\.)?([a-zA-Z0-9_$]+)\.[a-zA-Z0-9_$]+/i);
  if (prefixMatch && prefixMatch[1].length <= 30 && !['prototype', 'length'].includes(prefixMatch[1])) {
    return prefixMatch[1];
  }

  const codeMatch = htmlText.match(/<code>(?:ccEverywhere\.)?([a-zA-Z0-9_$]+)(?:\(\))?<\/code>/i);
  if (codeMatch) {
    const name = codeMatch[1].trim();
    if (name.length >= 3 && name.length <= 35 && (/^[A-Z][a-zA-Z0-9]+$/.test(name) || /^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(name))) {
      return name;
    }
  }

  const linkMatch = htmlText.match(/<a[^>]*>([^<]+(?:concept guide|guide|tutorial))<\/a>/i);
  if (linkMatch) {
    const title = linkMatch[1].replace(/\s*(concept guide|guide|tutorial)$/i, '').trim();
    if (title && title.length <= 35) return title;
  }

  return '';
}

/**
 * Maps heading from feed description into standard change type.
 */
function mapHeadingToType(heading) {
  const h = (heading || '').trim().toLowerCase();
  if (h.includes('breaking')) return 'Breaking';
  if (h.includes('remove')) return 'Removed';
  if (h.includes('deprecat')) return 'Deprecated';
  if (h.includes('add') || h.includes('new')) return 'New';
  if (h.includes('fix') || h.includes('bug')) return 'Fixed';
  if (h.includes('doc')) return 'Docs';
  if (h.includes('enhance') || h.includes('improve') || h.includes('maintenance')) return 'Improved';
  return 'New';
}

/**
 * Parses description HTML into structured change rows.
 */
function parseDescriptionHtml(html) {
  if (!html) return [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const changes = [];
  let currentHeading = '';
  let currentType = 'New';
  const children = Array.from(tempDiv.children);

  if (children.length === 0) {
    const text = tempDiv.textContent.trim();
    if (text) changes.push({ type: 'Improved', module: extractDynamicModule(text), description: text });
    return changes;
  }

  children.forEach((child) => {
    const tag = child.tagName.toUpperCase();
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
      currentHeading = child.textContent.trim();
      currentType = mapHeadingToType(currentHeading);
      if (child.nextElementSibling && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(child.nextElementSibling.tagName.toUpperCase())) {
        changes.push({ type: currentType, module: extractDynamicModule(currentHeading), description: currentHeading });
      }
    } else if (tag === 'UL' || tag === 'OL') {
      child.querySelectorAll('li').forEach((li) => {
        const text = li.textContent.trim();
        const htmlContent = li.innerHTML.trim();
        if (htmlContent) {
          changes.push({ type: currentType, module: extractDynamicModule(htmlContent || text), description: htmlContent });
        }
      });
    } else if (tag === 'P') {
      const text = child.textContent.trim();
      const htmlContent = child.innerHTML.trim();
      if (htmlContent) {
        changes.push({ type: currentType, module: extractDynamicModule(htmlContent || text), description: htmlContent });
      }
    }
  });

  const lastChild = children[children.length - 1];
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(lastChild.tagName.toUpperCase())) {
    const heading = lastChild.textContent.trim();
    changes.push({ type: mapHeadingToType(heading), module: extractDynamicModule(heading), description: heading });
  }

  if (changes.length === 0) {
    const text = tempDiv.textContent.trim();
    if (text) changes.push({ type: currentType || 'Improved', module: extractDynamicModule(text), description: text });
  }

  return changes;
}

/**
 * Resolves the raw GitHub feed URL from the block element.
 */
function resolveFeedUrl(block) {
  let path = block.getAttribute('data-path') || block.dataset?.path || block.closest('[data-path]')?.getAttribute('data-path');
  if (!path) {
    const link = block.querySelector('a[href$=".xml"], a[href*="feed.xml"], a[href*="raw.githubusercontent.com"]');
    if (link) path = link.getAttribute('href');
  }
  if (!path) {
    try {
      const resourceUrl = getResourceUrl('/feed.xml');
      if (resourceUrl && !resourceUrl.endsWith('/')) path = resourceUrl;
    } catch (e) {
      // ignore
    }
  }
  if (!path) path = DEFAULT_FEED_URL;
  if (path.includes('github.com') && path.includes('/blob/')) {
    path = path.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return path;
}

/**
 * Loads the feed XML text from the resolved feed URL with fallbacks.
 */
async function loadChangelogFeed(feedUrl) {
  const urls = [feedUrl, feedUrl !== DEFAULT_FEED_URL ? DEFAULT_FEED_URL : null, '/src/pages/feed.xml', '/feed.xml'].filter(Boolean);
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return await resp.text();
    } catch (e) {
      // ignore
    }
  }
  return null;
}

/**
 * Parses XML feed text into structured releases, older releases, and channel metadata.
 */
function parseFeedXml(xmlText) {
  const items = [];
  const channelInfo = { title: '', description: '', link: '' };

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    if (!xmlDoc.querySelector('parsererror')) {
      const channel = xmlDoc.querySelector('channel');
      if (channel) {
        channelInfo.title = channel.querySelector('title')?.textContent?.trim() || '';
        channelInfo.description = channel.querySelector('description')?.textContent?.trim() || '';
        channelInfo.link = channel.querySelector('link')?.textContent?.trim() || '';
      }
      xmlDoc.querySelectorAll('item').forEach((item) => {
        let desc = item.querySelector('description')?.textContent || '';
        if (desc.startsWith('<![CDATA[')) desc = desc.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
        items.push({
          title: item.querySelector('title')?.textContent?.trim() || '',
          pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
          link: item.querySelector('link')?.textContent?.trim() || '',
          guid: item.querySelector('guid')?.textContent?.trim() || '',
          description: desc.trim(),
        });
      });
    }
  } catch (e) {
    // regex fallback
  }

  if (items.length === 0) {
    const chMatch = xmlText.match(/<channel>([\s\S]*?)<\/channel>/i);
    if (chMatch) {
      channelInfo.title = (chMatch[1].match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '';
      channelInfo.description = (chMatch[1].match(/<description>([\s\S]*?)<\/description>/i) || [])[1]?.trim() || '';
      channelInfo.link = (chMatch[1].match(/<link>([\s\S]*?)<\/link>/i) || [])[1]?.trim() || '';
    }
    const itemMatches = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    itemMatches.forEach((m) => {
      const content = m[1];
      const descMatch = content.match(/<description>([\s\S]*?)<\/description>/i);
      let desc = descMatch ? descMatch[1].trim() : '';
      if (desc.startsWith('<![CDATA[')) desc = desc.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
      items.push({
        title: (content.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '',
        pubDate: (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]?.trim() || '',
        link: (content.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]?.trim() || '',
        guid: (content.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1]?.trim() || '',
        description: desc,
      });
    });
  }

  const releases = [];
  const olderReleases = [];

  items.forEach((item, index) => {
    const { title, pubDate, guid, description } = item;
    const { year, monthNum, displayDate, rawDate } = parseDate(pubDate, guid || title);

    if (/^v[1-3]\./.test(title)) {
      const cleanSummary = description.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      olderReleases.push({
        version: title,
        date: displayDate || pubDate,
        releaseKind: 'Older release',
        summary: cleanSummary.length > 200 ? `${cleanSummary.slice(0, 200)}...` : cleanSummary,
        description,
      });
      return;
    }

    const isLatest = index === 0;
    const isDocUpdate = /^\d{4}-\d{2}-\d{2}$/.test(title);
    const releaseKind = isLatest ? 'Latest' : (isDocUpdate ? 'Documentation update' : '');

    releases.push({
      version: title,
      date: displayDate,
      rawDate,
      year,
      monthNum,
      releaseKind,
      isLatest,
      guid,
      changes: parseDescriptionHtml(description),
    });
  });

  return { releases, olderReleases, channelInfo };
}

/**
 * Decorates the changelog block
 * @param {Element} block The changelog block element
 */
export default async function decorate(block) {
  const authoredTitle = block.querySelector('h1, h2, h3')?.textContent?.trim();
  const authoredDesc = block.querySelector('p')?.textContent?.trim();
  const authoredLinks = Array.from(block.querySelectorAll('a')).filter((a) => {
    const href = a.getAttribute('href') || '';
    return href && !href.endsWith('.xml') && !href.includes('feed.xml');
  });

  const feedUrl = resolveFeedUrl(block);
  block.setAttribute('daa-lh', 'changelog');
  block.innerHTML = '<div class="changelog-loading"><div class="changelog-spinner" aria-label="Loading changelog"></div></div>';

  const xmlText = await loadChangelogFeed(feedUrl);
  block.innerHTML = '';

  if (!xmlText) {
    block.innerHTML = '<div class="changelog-empty-state"><p class="spectrum-Body spectrum-Body--sizeL changelog-empty-title">Unable to load changelog feed. Please check back later.</p></div>';
    return;
  }

  const { releases, olderReleases, channelInfo } = parseFeedXml(xmlText);
  const availableYears = Array.from(new Set(releases.map((r) => r.year).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const availableModules = Array.from(new Set(releases.flatMap((r) => r.changes.map((c) => c.module)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const latestRelease = releases[0] || null;

  const filterState = { module: 'all', year: 'all', month: 'all', types: new Set() };

  // Read URL query params
  function readFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module');
    const yr = params.get('year');
    const mo = params.get('month');
    const typesParam = params.get('types') || params.get('type');

    if (mod && (availableModules.includes(mod) || mod === 'all')) filterState.module = mod;
    if (yr && (availableYears.includes(yr) || yr === 'all')) filterState.year = yr;
    if (mo) filterState.month = mo;
    if (typesParam) {
      filterState.types.clear();
      typesParam.split(',').forEach((t) => {
        const match = ALL_TYPES.find((item) => item.key.toLowerCase() === t.trim().toLowerCase());
        if (match) filterState.types.add(match.key);
      });
    }
  }

  function writeToUrl() {
    const params = new URLSearchParams(window.location.search);
    if (filterState.module && filterState.module !== 'all') params.set('module', filterState.module);
    else params.delete('module');

    if (filterState.year && filterState.year !== 'all') params.set('year', filterState.year);
    else params.delete('year');

    if (filterState.month && filterState.month !== 'all') params.set('month', filterState.month);
    else params.delete('month');

    if (filterState.types.size > 0) params.set('types', Array.from(filterState.types).join(','));
    else { params.delete('types'); params.delete('type'); }

    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }

  readFromUrl();

  const container = createTag('div', { class: 'changelog-container' });

  // 1. Header Section
  const headerSection = createTag('header', { class: 'changelog-header' });
  const title = createTag('h1', { class: 'spectrum-Heading spectrum-Heading--sizeXL changelog-title' });
  title.textContent = authoredTitle || 'Changelog';

  const descText = authoredDesc || channelInfo?.description || '';
  const desc = descText ? createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL changelog-description' }) : null;
  if (desc) desc.textContent = descText;

  const subHeader = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-sub-header' });
  const latestInfo = createTag('span', { class: 'changelog-latest-info' });
  if (latestRelease && (latestRelease.version || latestRelease.date)) {
    const parts = [latestRelease.version ? `<strong>${latestRelease.version}</strong>` : '', latestRelease.date].filter(Boolean);
    latestInfo.innerHTML = `Latest: ${parts.join(' · ')}`;
  }

  const quickLinks = createTag('div', { class: 'changelog-quick-links' });
  authoredLinks.forEach((a) => {
    const linkEl = createTag('a', { class: 'spectrum-Link changelog-quick-link', href: a.href, target: '_blank', rel: 'noopener noreferrer' });
    linkEl.textContent = a.textContent.trim() || a.href;
    quickLinks.append(linkEl);
  });

  const rssLink = createTag('a', {
    class: 'spectrum-Link changelog-quick-link changelog-rss-link',
    href: feedUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': 'Subscribe to RSS feed',
  });
  rssLink.innerHTML = `${getIconSvg('rss')} <span>RSS feed</span>`;
  quickLinks.append(rssLink);

  subHeader.append(latestInfo, quickLinks);
  if (desc) headerSection.append(title, desc, subHeader);
  else headerSection.append(title, subHeader);

  // TOC target for filters
  const filterAnchor = createTag('div', { class: 'heading2 changelog-toc-target' });
  filterAnchor.innerHTML = '<h2 id="filters" class="sr-only">Filters</h2>';

  // 2. Filter Card
  const filterCard = createTag('section', { class: 'changelog-filter-card', 'aria-label': 'Changelog filters' });
  const dropdownRow = createTag('div', { class: 'changelog-filter-row-dropdowns' });

  function createDropdownGroup(id, labelText, options, currentValue) {
    const group = createTag('div', { class: 'changelog-filter-group' });
    const label = createTag('label', { class: 'spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label', for: id });
    label.textContent = labelText;
    const select = createTag('select', { id, name: id.replace('changelog-filter-', ''), 'aria-label': `Filter by ${labelText}` });
    options.forEach(({ value, text }) => {
      const opt = createTag('option', { value });
      opt.textContent = text;
      if (value === currentValue) opt.selected = true;
      select.appendChild(opt);
    });
    group.append(label, select);
    return { group, select };
  }

  const { group: moduleGroup, select: moduleSelect } = createDropdownGroup(
    'changelog-filter-module',
    'Module',
    [{ value: 'all', text: 'All modules' }, ...availableModules.map((m) => ({ value: m, text: m }))],
    filterState.module,
  );

  const { group: yearGroup, select: yearSelect } = createDropdownGroup(
    'changelog-filter-year',
    'Year',
    [{ value: 'all', text: 'All years' }, ...availableYears.map((y) => ({ value: y, text: y }))],
    filterState.year,
  );

  const { group: monthGroup, select: monthSelect } = createDropdownGroup(
    'changelog-filter-month',
    'Month',
    [{ value: 'all', text: 'All months' }, ...MONTH_NAMES.map((m, idx) => ({ value: String(idx + 1), text: m }))],
    filterState.month,
  );

  dropdownRow.append(moduleGroup, yearGroup, monthGroup);

  const typeRow = createTag('div', { class: 'changelog-filter-row-types' });
  typeRow.innerHTML = '<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label">Type of change</div>';
  const pillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': 'Filter by change type' });
  typeRow.append(pillsContainer);

  const summaryRow = createTag('div', { class: 'changelog-filter-summary-row' });
  const summaryText = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-filter-summary-text', 'aria-live': 'polite' });
  summaryRow.append(summaryText);
  filterCard.append(dropdownRow, typeRow, summaryRow);

  const resultsContainer = createTag('div', { class: 'changelog-results' });

  // 3. Older releases section
  const olderSection = createTag('section', { class: 'changelog-older-section', id: 'sdk-v1-v3', 'aria-label': 'Older releases SDK v1-v3' });
  if (olderReleases.length > 0) {
    olderSection.innerHTML = `
      <div class="heading2 changelog-toc-target"><h2 id="sdk-v1-v3-heading" class="spectrum-Heading spectrum-Heading--sizeL changelog-year-heading">Older releases</h2></div>
      <div class="changelog-accordion">
        <button class="spectrum-Heading spectrum-Heading--sizeXS changelog-accordion-trigger" type="button" aria-expanded="false" aria-controls="changelog-older-content">
          <span class="changelog-accordion-left">
            <span class="changelog-accordion-title">Older releases (v1–v3)</span>
            <span class="spectrum-Body spectrum-Body--sizeS changelog-accordion-count">${olderReleases.length} older releases</span>
          </span>
          <span class="changelog-accordion-arrow">${getIconSvg('chevron')}</span>
        </button>
        <div class="changelog-accordion-content" id="changelog-older-content" hidden>
          <div class="changelog-older-list">
            ${olderReleases.map((rel) => `
              <div class="changelog-older-item">
                <div class="changelog-older-meta">
                  <span class="spectrum-Heading spectrum-Heading--sizeXS changelog-older-version">${rel.version}</span> · <span class="spectrum-Body spectrum-Body--sizeS changelog-older-date">${rel.date}</span>
                </div>
                <div class="spectrum-Body spectrum-Body--sizeS changelog-older-desc">${formatCodeChips(rel.summary || rel.description || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const accordionTrigger = olderSection.querySelector('.changelog-accordion-trigger');
    const accordionContent = olderSection.querySelector('.changelog-accordion-content');
    accordionTrigger.addEventListener('click', () => {
      const isExpanded = accordionTrigger.getAttribute('aria-expanded') === 'true';
      accordionTrigger.setAttribute('aria-expanded', String(!isExpanded));
      accordionContent.hidden = isExpanded;
    });
  }

  // Filtering & Rendering logic
  function getFilteredData() {
    let totalMatchingChanges = 0;
    const matchingReleases = [];

    releases.forEach((rel) => {
      if (filterState.year !== 'all' && rel.year !== filterState.year) return;
      if (filterState.month !== 'all' && String(rel.monthNum) !== String(filterState.month)) return;

      const matchingChanges = rel.changes.filter((c) => {
        if (filterState.module !== 'all' && c.module !== filterState.module) return false;
        if (filterState.types.size > 0 && !filterState.types.has(c.type)) return false;
        return true;
      });

      if (matchingChanges.length > 0) {
        totalMatchingChanges += matchingChanges.length;
        matchingReleases.push({ ...rel, changes: matchingChanges });
      }
    });

    return { matchingReleases, totalMatchingChanges };
  }

  function renderPills() {
    pillsContainer.innerHTML = '';
    const counts = { All: 0 };
    ALL_TYPES.forEach((t) => { counts[t.key] = 0; });

    releases.forEach((rel) => {
      if (filterState.year !== 'all' && rel.year !== filterState.year) return;
      if (filterState.month !== 'all' && String(rel.monthNum) !== String(filterState.month)) return;

      rel.changes.forEach((c) => {
        if (filterState.module !== 'all' && c.module !== filterState.module) return;
        counts.All += 1;
        if (counts[c.type] !== undefined) counts[c.type] += 1;
      });
    });

    const isAllSelected = filterState.types.size === 0;
    const allPill = createTag('button', {
      type: 'button',
      class: `changelog-pill ${isAllSelected ? 'is-selected' : ''}`,
      'aria-pressed': String(isAllSelected),
    });
    allPill.innerHTML = `<span>All types</span> <span class="changelog-pill-count">${counts.All}</span>`;
    allPill.addEventListener('click', () => {
      filterState.types.clear();
      writeToUrl();
      applyFilters();
    });
    pillsContainer.appendChild(allPill);

    ALL_TYPES.forEach((t) => {
      const isSelected = filterState.types.has(t.key);
      const pill = createTag('button', {
        type: 'button',
        class: `changelog-pill ${isSelected ? 'is-selected' : ''}`,
        'aria-pressed': String(isSelected),
      });
      pill.innerHTML = `${getIconSvg(t.icon)} <span>${t.label}</span> <span class="changelog-pill-count">${counts[t.key]}</span>`;
      pill.addEventListener('click', () => {
        if (filterState.types.has(t.key)) filterState.types.delete(t.key);
        else filterState.types.add(t.key);
        writeToUrl();
        applyFilters();
      });
      pillsContainer.appendChild(pill);
    });
  }

  function renderReleasesList(matchingReleases) {
    resultsContainer.innerHTML = '';

    if (matchingReleases.length === 0) {
      resultsContainer.innerHTML = `
        <div class="changelog-empty-state">
          <p class="spectrum-Body spectrum-Body--sizeL changelog-empty-title">No changes match the selected filters.</p>
          <button type="button" class="changelog-clear-btn spectrum-Button spectrum-Button--secondary spectrum-Button--sizeM">
            <span class="spectrum-Button-label">Clear filters</span>
          </button>
        </div>
      `;
      resultsContainer.querySelector('button').addEventListener('click', clearAllFilters);
      return;
    }

    const byYear = new Map();
    matchingReleases.forEach((rel) => {
      if (!byYear.has(rel.year)) byYear.set(rel.year, []);
      byYear.get(rel.year).push(rel);
    });

    byYear.forEach((relsInYear, year) => {
      const yearSection = createTag('section', { class: 'changelog-year-section', 'aria-labelledby': `heading-year-${year}` });
      yearSection.innerHTML = `
        <div class="heading2 changelog-toc-target"><h2 id="${year}" class="spectrum-Heading spectrum-Heading--sizeL changelog-year-heading">${year}</h2></div>
        <div class="changelog-release-list"></div>
      `;
      const releaseList = yearSection.querySelector('.changelog-release-list');

      relsInYear.forEach((rel) => {
        const cardId = (rel.guid || rel.version).replace(/\./g, '-');
        const releaseCard = createTag('article', { class: 'changelog-release-card', id: cardId });
        const versionSlug = rel.version.replace(/\./g, '-');
        if (versionSlug !== cardId) {
          releaseCard.prepend(createTag('a', { id: versionSlug, class: 'sr-only' }));
        }

        const badgeHtml = rel.isLatest
          ? '<span class="changelog-badge changelog-badge-latest">Latest</span>'
          : (rel.releaseKind ? `<span class="changelog-badge">${rel.releaseKind}</span>` : '');

        const changesHtml = rel.changes.map((c) => {
          const iconType = ALL_TYPES.find((item) => item.key === c.type)?.icon || 'new';
          const moduleHtml = c.module ? `<div class="spectrum-Detail spectrum-Detail--sizeS changelog-change-module">${formatCodeChips(c.module)}</div>` : '';
          return `
            <div class="changelog-change-row type-${c.type.toLowerCase()}">
              <div class="changelog-change-type-col">
                <div class="spectrum-Body spectrum-Body--sizeS spectrum-Body-strong changelog-change-type type-${c.type.toLowerCase()}">
                  ${getIconSvg(iconType)} <span>${c.type}</span>
                </div>
                ${moduleHtml}
              </div>
              <div class="changelog-change-content">
                <div class="spectrum-Body spectrum-Body--sizeM changelog-change-description">${formatCodeChips(c.description)}</div>
              </div>
            </div>
          `;
        }).join('');

        releaseCard.innerHTML = `
          <div class="changelog-release-meta">
            <h3 class="spectrum-Heading spectrum-Heading--sizeS changelog-release-version">${rel.version}</h3>
            <time class="spectrum-Body spectrum-Body--sizeS changelog-release-date" datetime="${rel.rawDate}">${rel.date}</time>
            ${badgeHtml}
          </div>
          <div class="changelog-release-changes">${changesHtml}</div>
        `;

        releaseList.appendChild(releaseCard);
      });

      resultsContainer.appendChild(yearSection);
    });
  }

  function updateSummary(totalMatchingChanges, matchingReleasesCount) {
    const isFiltered = filterState.module !== 'all' || filterState.year !== 'all' || filterState.month !== 'all' || filterState.types.size > 0;
    summaryText.innerHTML = '';
    if (!isFiltered) {
      summaryText.innerHTML = `Showing <strong>${totalMatchingChanges} changes</strong> in <strong>${matchingReleasesCount} releases</strong> and ${olderReleases.length} older releases`;
    } else {
      const summaryMsg = createTag('span');
      summaryMsg.innerHTML = `Showing <strong>${totalMatchingChanges} changes</strong> in <strong>${matchingReleasesCount} releases</strong> · `;
      const clearBtn = createTag('button', { type: 'button', class: 'spectrum-Link changelog-clear-link' });
      clearBtn.textContent = 'Clear filters';
      clearBtn.addEventListener('click', clearAllFilters);
      summaryText.append(summaryMsg, clearBtn);
    }
  }

  function clearAllFilters() {
    filterState.module = 'all';
    filterState.year = 'all';
    filterState.month = 'all';
    filterState.types.clear();

    moduleSelect.value = 'all';
    yearSelect.value = 'all';
    monthSelect.value = 'all';

    writeToUrl();
    applyFilters();
  }

  function applyFilters() {
    const { matchingReleases, totalMatchingChanges } = getFilteredData();
    renderPills();
    renderReleasesList(matchingReleases);
    updateSummary(totalMatchingChanges, matchingReleases.length);
  }

  moduleSelect.addEventListener('change', (e) => {
    filterState.module = e.target.value;
    writeToUrl();
    applyFilters();
  });

  yearSelect.addEventListener('change', (e) => {
    filterState.year = e.target.value;
    writeToUrl();
    applyFilters();
  });

  monthSelect.addEventListener('change', (e) => {
    filterState.month = e.target.value;
    writeToUrl();
    applyFilters();
  });

  container.append(headerSection, filterAnchor, filterCard, resultsContainer, olderSection);
  block.appendChild(container);

  applyFilters();
}
