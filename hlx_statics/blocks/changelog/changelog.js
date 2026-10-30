import { createTag } from '../../scripts/lib-adobeio.js';
import { fetchReleases, fetchReleasesMetadata } from '../../scripts/lib-helix.js';

const ALL_TYPES = [
  { key: 'breaking', label: 'Breaking', icon: 'breaking' },
  { key: 'removed', label: 'Removed', icon: 'removed' },
  { key: 'deprecated', label: 'Deprecated', icon: 'deprecated' },
  { key: 'new', label: 'New', icon: 'new' },
  { key: 'improved', label: 'Improved', icon: 'improved' },
  { key: 'fixed', label: 'Fixed', icon: 'fixed' },
  { key: 'docs', label: 'Docs', icon: 'docs' },
];

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
 * Lightweight YAML parser supporting subsets used in releases.yml and releases-metadata.yml.
 */
function parseYaml(text) {
  if (!text || typeof text !== 'string') return null;

  const rawLines = text.split(/\r?\n/);
  const lines = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const raw = rawLines[i];
    let inSingle = false;
    let inDouble = false;
    let commentIdx = -1;

    for (let c = 0; c < raw.length; c += 1) {
      const ch = raw[c];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === '#' && !inSingle && !inDouble) {
        commentIdx = c;
        break;
      }
    }

    const lineWithoutComment = commentIdx >= 0 ? raw.slice(0, commentIdx) : raw;
    if (lineWithoutComment.trim().length === 0) continue;

    const indent = lineWithoutComment.search(/\S/);
    lines.push({ indent, content: lineWithoutComment.trim() });
  }

  let index = 0;

  function parseValue(valStr) {
    if (valStr === undefined || valStr === null) return null;
    valStr = valStr.trim();
    if (valStr === '') return null;

    // Flow array: [item1, item2]
    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const inner = valStr.slice(1, -1).trim();
      if (!inner) return [];
      const items = [];
      let cur = '';
      let s = false;
      let d = false;
      for (let i = 0; i < inner.length; i += 1) {
        const c = inner[i];
        if (c === "'" && !d) s = !s;
        else if (c === '"' && !s) d = !d;
        else if (c === ',' && !s && !d) {
          items.push(parseValue(cur));
          cur = '';
          continue;
        }
        cur += c;
      }
      if (cur.trim()) items.push(parseValue(cur));
      return items;
    }

    // Quoted string
    if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
      return valStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }

    // Boolean
    if (valStr.toLowerCase() === 'true') return true;
    if (valStr.toLowerCase() === 'false') return false;
    if (valStr.toLowerCase() === 'null' || valStr === '~') return null;

    // Number
    if (/^-?\d+(\.\d+)?$/.test(valStr)) {
      return Number(valStr);
    }

    return valStr;
  }

  function parseBlock(minIndent) {
    if (index >= lines.length) return null;

    const currentLine = lines[index];
    if (currentLine.indent < minIndent) return null;

    const isList = currentLine.content.startsWith('- ') || currentLine.content === '-';

    if (isList) {
      const list = [];
      const listIndent = currentLine.indent;

      while (index < lines.length && lines[index].indent === listIndent && (lines[index].content.startsWith('- ') || lines[index].content === '-')) {
        const line = lines[index];
        index += 1;
        const itemContent = line.content.slice(1).trim();

        if (!itemContent) {
          if (index < lines.length && lines[index].indent > listIndent) {
            list.push(parseBlock(lines[index].indent));
          } else {
            list.push(null);
          }
        } else if (itemContent.includes(':')) {
          const colonIdx = itemContent.indexOf(':');
          const k = parseValue(itemContent.slice(0, colonIdx));
          const restVal = itemContent.slice(colonIdx + 1).trim();
          const obj = {};

          if (restVal) {
            obj[k] = parseValue(restVal);
          } else if (index < lines.length && lines[index].indent > listIndent) {
            obj[k] = parseBlock(lines[index].indent);
          } else {
            obj[k] = null;
          }

          while (index < lines.length && lines[index].indent > listIndent && !lines[index].content.startsWith('- ')) {
            const nextLine = lines[index];
            const cIdx = nextLine.content.indexOf(':');
            if (cIdx !== -1) {
              const subK = parseValue(nextLine.content.slice(0, cIdx));
              const subRest = nextLine.content.slice(cIdx + 1).trim();
              index += 1;
              if (subRest) {
                obj[subK] = parseValue(subRest);
              } else if (index < lines.length && lines[index].indent > nextLine.indent) {
                obj[subK] = parseBlock(lines[index].indent);
              } else {
                obj[subK] = null;
              }
            } else {
              index += 1;
            }
          }

          list.push(obj);
        } else {
          list.push(parseValue(itemContent));
        }
      }
      return list;
    }

    const map = {};
    const mapIndent = currentLine.indent;

    while (index < lines.length && lines[index].indent === mapIndent) {
      const line = lines[index];
      if (line.content.startsWith('- ')) break;

      const colonIdx = line.content.indexOf(':');
      if (colonIdx === -1) {
        index += 1;
        continue;
      }

      const key = parseValue(line.content.slice(0, colonIdx));
      const valStr = line.content.slice(colonIdx + 1).trim();
      index += 1;

      if (valStr) {
        map[key] = parseValue(valStr);
      } else if (index < lines.length && lines[index].indent > mapIndent) {
        map[key] = parseBlock(lines[index].indent);
      } else {
        map[key] = null;
      }
    }
    return map;
  }

  return parseBlock(0);
}

/**
 * Format markdown inline code (`code`), bold (**text**), italic (*text*), and links ([text](url)).
 */
function renderMarkdown(text) {
  if (!text) return '';
  let out = String(text);
  // Code chips `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
    const isExternal = /^https?:\/\//i.test(href);
    const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${targetAttr}>${label}</a>`;
  });
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

/**
 * Parses date string (ISO YYYY-MM-DD, or fallback) into structured date metadata.
 */
function parseDate(dateStr) {
  const str = (dateStr || '').trim();
  if (!str) return { year: '', monthName: '', displayDate: '', rawDate: '' };

  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
    const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return {
      year: y,
      monthName,
      displayDate,
      rawDate: `${y}-${m}-${d}`,
    };
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = String(parsed.getUTCFullYear());
    const monthName = parsed.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
    const displayDate = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return {
      year: y,
      monthName,
      displayDate,
      rawDate: `${y}-${m}-${d}`,
    };
  }

  return { year: '', monthName: '', displayDate: str, rawDate: str };
}

/**
 * Decorates the changelog block
 * @param {Element} block The changelog block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'changelog');
  block.innerHTML = '<div class="changelog-loading"><div class="changelog-spinner" aria-label="Loading changelog"></div></div>';

  let releasesDoc;
  let releasesMetadata;

  try {
    releasesDoc = await fetchReleases();
  } catch (e) {
    // ignore
  }

  try {
    releasesMetadata = await fetchReleasesMetadata();
  } catch (e) {
    // ignore
  }

  const parsedReleasesDoc = typeof releasesDoc === 'string' ? parseYaml(releasesDoc) : releasesDoc;
  const parsedReleasesMeta = typeof releasesMetadata === 'string' ? parseYaml(releasesMetadata) : releasesMetadata;

  if (!parsedReleasesDoc) {
    block.innerHTML = '<div class="changelog-empty-state"><p class="spectrum-Body spectrum-Body--sizeL changelog-empty-title">Unable to load changelog data. Please check back later.</p></div>';
    return;
  }

  const modulesMap = parsedReleasesDoc?.modules || {};
  const kindsMap = parsedReleasesMeta?.kinds || { sdk: 'SDK release', docs: 'Docs update', maintenance: 'Maintenance' };
  const legacyInfo = parsedReleasesMeta?.legacy || { label: 'SDK v1–v3', note: '', hint: '' };
  const rawReleases = Array.isArray(parsedReleasesDoc?.releases) ? parsedReleasesDoc.releases : [];

  const authoredTitle = block.querySelector('h1, h2, h3')?.textContent?.trim();
  const authoredDesc = block.querySelector('p')?.textContent?.trim();
  const authoredLinks = Array.from(block.querySelectorAll('a')).filter((a) => {
    const href = a.getAttribute('href') || '';
    return href && !href.endsWith('.xml') && !href.includes('feed.xml');
  });

  const authoredFeedLink = block.querySelector('a[href$=".xml"], a[href*="feed.xml"]')?.getAttribute('href');
  const feedUrl = authoredFeedLink || parsedReleasesMeta?.page?.url || '/feed.xml';

  block.innerHTML = '';

  const releases = [];
  const olderReleases = [];

  rawReleases.forEach((rel) => {
    const { year, monthName, displayDate, rawDate } = parseDate(rel.date);
    const isLegacy = Boolean(rel.summary) || (rel.version && /^[1-3]\./.test(rel.version));

    if (isLegacy) {
      olderReleases.push({
        version: rel.version ? `v${rel.version.replace(/^v/i, '')}` : (rel.version || ''),
        date: displayDate || rel.date || '',
        summary: rel.summary || '',
        breaking: Boolean(rel.breaking),
        rawDate,
      });
      return;
    }

    const isLatest = releases.length === 0;
    const changes = Array.isArray(rel.changes) ? rel.changes.map((c) => ({
      type: (c.type || 'new').toLowerCase(),
      modules: Array.isArray(c.modules) ? c.modules : (c.modules ? [c.modules] : []),
      text: c.text || '',
      action: c.action || '',
      open: Boolean(c.open),
    })) : [];

    releases.push({
      version: rel.version || '',
      date: displayDate,
      rawDate,
      year,
      monthName,
      kind: rel.kind || 'sdk',
      title: rel.title || '',
      isLatest,
      changes,
    });
  });

  // Extract filter options from metadata or releases
  const moduleFilterMeta = (parsedReleasesMeta?.filters || []).find((f) => f.id === 'module');
  const yearFilterMeta = (parsedReleasesMeta?.filters || []).find((f) => f.id === 'year');
  const monthFilterMeta = (parsedReleasesMeta?.filters || []).find((f) => f.id === 'month');

  let moduleOptions = [];
  if (moduleFilterMeta?.options && Array.isArray(moduleFilterMeta.options)) {
    moduleOptions = moduleFilterMeta.options.map((opt) => ({
      value: opt.id,
      text: opt.label || modulesMap[opt.id] || opt.id,
    }));
  } else if (Object.keys(modulesMap).length > 0) {
    moduleOptions = Object.entries(modulesMap).map(([id, label]) => ({
      value: id,
      text: label,
    }));
  } else {
    const uniqueModIds = Array.from(new Set(releases.flatMap((r) => r.changes.flatMap((c) => c.modules)))).filter(Boolean);
    moduleOptions = uniqueModIds.map((id) => ({ value: id, text: id }));
  }

  let yearOptions = [];
  if (yearFilterMeta?.options && Array.isArray(yearFilterMeta.options)) {
    yearOptions = yearFilterMeta.options.map(String);
  } else {
    yearOptions = Array.from(new Set(releases.map((r) => r.year).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }

  const latestRelease = releases[0] || null;
  const filterState = { module: 'all', year: 'all', month: 'all', types: new Set() };

  function readFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module');
    const yr = params.get('year');
    const mo = params.get('month');
    const typesParam = params.get('types') || params.get('type');

    if (mod && (mod === 'all' || moduleOptions.some((m) => m.value === mod))) {
      filterState.module = mod;
    }
    if (yr && (yr === 'all' || yearOptions.includes(yr))) {
      filterState.year = yr;
    }
    if (mo) {
      filterState.month = mo;
    }
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
    else {
      params.delete('types');
      params.delete('type');
    }

    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }

  readFromUrl();

  const container = createTag('div', { class: 'changelog-container' });

  // 1. Header Section
  const headerSection = createTag('header', { class: 'changelog-header' });
  const title = createTag('h1', { class: 'spectrum-Heading spectrum-Heading--sizeXL changelog-title' });
  title.textContent = authoredTitle || parsedReleasesMeta?.page?.title || 'Changelog';

  const descText = authoredDesc || parsedReleasesMeta?.page?.description || '';
  const desc = descText ? createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL changelog-description' }) : null;
  if (desc) desc.textContent = descText;

  const subHeader = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-sub-header' });
  const latestInfo = createTag('span', { class: 'changelog-latest-info' });
  if (latestRelease && (latestRelease.version || latestRelease.date)) {
    const parts = [
      latestRelease.version ? `<strong>${latestRelease.version}</strong>` : (latestRelease.title ? `<strong>${latestRelease.title}</strong>` : ''),
      latestRelease.date,
    ].filter(Boolean);
    latestInfo.innerHTML = `Latest: ${parts.join(' · ')}`;
  }

  const quickLinks = createTag('div', { class: 'changelog-quick-links' });
  authoredLinks.forEach((a) => {
    const linkEl = createTag('a', {
      class: 'spectrum-Link changelog-quick-link',
      href: a.href,
      target: '_blank',
      rel: 'noopener noreferrer',
    });
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
      if (String(value).toLowerCase() === String(currentValue).toLowerCase()) opt.selected = true;
      select.appendChild(opt);
    });
    group.append(label, select);
    return { group, select };
  }

  const { group: moduleGroup, select: moduleSelect } = createDropdownGroup(
    'changelog-filter-module',
    moduleFilterMeta?.label || 'Module',
    [{ value: 'all', text: moduleFilterMeta?.allLabel || 'All modules' }, ...moduleOptions],
    filterState.module,
  );

  const { group: yearGroup, select: yearSelect } = createDropdownGroup(
    'changelog-filter-year',
    yearFilterMeta?.label || 'Year',
    [{ value: 'all', text: yearFilterMeta?.allLabel || 'All years' }, ...yearOptions.map((y) => ({ value: y, text: y }))],
    filterState.year,
  );

  function getMonthOptionsForYear(selectedYear) {
    const allLabel = monthFilterMeta?.allLabel || 'All months';
    const opts = [{ value: 'all', text: allLabel }];

    if (selectedYear !== 'all' && monthFilterMeta?.optionsByYear?.[selectedYear]) {
      const yearMonthNames = monthFilterMeta.optionsByYear[selectedYear];
      yearMonthNames.forEach((monthName) => {
        opts.push({ value: monthName, text: monthName });
      });
    } else if (monthFilterMeta?.optionsByYear) {
      const seen = new Set();
      Object.values(monthFilterMeta.optionsByYear).forEach((monthList) => {
        if (Array.isArray(monthList)) {
          monthList.forEach((monthName) => {
            if (!seen.has(monthName)) {
              seen.add(monthName);
              opts.push({ value: monthName, text: monthName });
            }
          });
        }
      });
    } else if (Array.isArray(monthFilterMeta?.options)) {
      monthFilterMeta.options.forEach((opt) => {
        const val = typeof opt === 'object' ? (opt.label || opt.id) : opt;
        opts.push({ value: val, text: val });
      });
    } else {
      const seen = new Set();
      releases.forEach((rel) => {
        if (rel.monthName && !seen.has(rel.monthName)) {
          seen.add(rel.monthName);
          opts.push({ value: rel.monthName, text: rel.monthName });
        }
      });
    }
    return opts;
  }

  const { group: monthGroup, select: monthSelect } = createDropdownGroup(
    'changelog-filter-month',
    monthFilterMeta?.label || 'Month',
    getMonthOptionsForYear(filterState.year),
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
  const olderSection = createTag('section', { class: 'changelog-older-section', id: 'sdk-v1-v3', 'aria-label': `Older releases ${legacyInfo.label || 'SDK v1-v3'}` });
  if (olderReleases.length > 0) {
    olderSection.innerHTML = `
      <div class="heading2 changelog-toc-target"><h2 id="sdk-v1-v3-heading" class="spectrum-Heading spectrum-Heading--sizeL changelog-year-heading">Older releases</h2></div>
      <div class="changelog-accordion">
        <button class="spectrum-Heading spectrum-Heading--sizeXS changelog-accordion-trigger" type="button" aria-expanded="false" aria-controls="changelog-older-content">
          <span class="changelog-accordion-left">
            <span class="changelog-accordion-title">Older releases (${legacyInfo.label || 'v1–v3'})</span>
            <span class="spectrum-Body spectrum-Body--sizeS changelog-accordion-count">${olderReleases.length} older releases</span>
          </span>
          <span class="changelog-accordion-arrow">${getIconSvg('chevron')}</span>
        </button>
        <div class="changelog-accordion-content" id="changelog-older-content" hidden>
          ${legacyInfo.hint ? `<p class="spectrum-Body spectrum-Body--sizeS" style="color: #6e6e6e; margin: 0 0 16px 0;">${legacyInfo.hint}</p>` : ''}
          <div class="changelog-older-list">
            ${olderReleases.map((rel) => `
              <div class="changelog-older-item">
                <div class="changelog-older-meta">
                  <span class="spectrum-Heading spectrum-Heading--sizeXS changelog-older-version">${rel.version}</span> · <span class="spectrum-Body spectrum-Body--sizeS changelog-older-date">${rel.date}</span>
                  ${rel.breaking ? '<span class="changelog-badge changelog-badge-breaking">Breaking</span>' : ''}
                </div>
                <div class="spectrum-Body spectrum-Body--sizeS changelog-older-desc">${renderMarkdown(rel.summary || '')}</div>
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

  function updateMonthSelectOptions() {
    const options = getMonthOptionsForYear(filterState.year);
    monthSelect.innerHTML = '';
    let hasCurrent = false;

    options.forEach(({ value, text }) => {
      const opt = createTag('option', { value });
      opt.textContent = text;
      if (String(value).toLowerCase() === String(filterState.month).toLowerCase()
        || (filterState.month !== 'all' && text.toLowerCase() === String(filterState.month).toLowerCase())) {
        opt.selected = true;
        hasCurrent = true;
      }
      monthSelect.appendChild(opt);
    });

    if (!hasCurrent && filterState.month !== 'all') {
      filterState.month = 'all';
      monthSelect.value = 'all';
      writeToUrl();
    }
  }

  function matchesMonth(rel) {
    if (filterState.month === 'all') return true;
    return rel.monthName.toLowerCase() === String(filterState.month).toLowerCase();
  }

  // Filtering & Rendering logic
  function getFilteredData() {
    let totalMatchingChanges = 0;
    const matchingReleases = [];

    releases.forEach((rel) => {
      if (filterState.year !== 'all' && rel.year !== filterState.year) return;
      if (!matchesMonth(rel)) return;

      if (rel.changes.length === 0) {
        if (filterState.module === 'all' && filterState.types.size === 0) {
          matchingReleases.push(rel);
        }
        return;
      }

      const matchingChanges = rel.changes.filter((c) => {
        if (filterState.module !== 'all' && !c.modules.includes(filterState.module)) return false;
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
    const counts = { all: 0 };
    ALL_TYPES.forEach((t) => { counts[t.key] = 0; });

    releases.forEach((rel) => {
      if (filterState.year !== 'all' && rel.year !== filterState.year) return;
      if (!matchesMonth(rel)) return;

      rel.changes.forEach((c) => {
        if (filterState.module !== 'all' && !c.modules.includes(filterState.module)) return;
        counts.all += 1;
        if (counts[c.type] !== undefined) counts[c.type] += 1;
      });
    });

    const isAllSelected = filterState.types.size === 0;
    const allPill = createTag('button', {
      type: 'button',
      class: `changelog-pill ${isAllSelected ? 'is-selected' : ''}`,
      'aria-pressed': String(isAllSelected),
    });
    allPill.innerHTML = `<span>All types</span> <span class="changelog-pill-count">${counts.all}</span>`;
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
        const cardId = (rel.version ? rel.version.replace(/\./g, '-') : `docs-${rel.rawDate}`);
        const releaseCard = createTag('article', { class: 'changelog-release-card', id: cardId });
        if (rel.version) {
          const versionSlug = rel.version.replace(/\./g, '-');
          if (versionSlug !== cardId) {
            releaseCard.prepend(createTag('a', { id: versionSlug, class: 'sr-only' }));
          }
        }

        let badgeHtml = '';
        if (rel.isLatest) {
          badgeHtml = '<span class="changelog-badge changelog-badge-latest">Latest</span>';
        } else if (rel.kind === 'docs' && rel.version) {
          badgeHtml = '<span class="changelog-badge">Docs update</span>';
        } else if (rel.kind === 'maintenance') {
          badgeHtml = '<span class="changelog-badge">Maintenance</span>';
        } else if (rel.kind && rel.kind !== 'sdk') {
          badgeHtml = `<span class="changelog-badge">${kindsMap[rel.kind] || rel.kind}</span>`;
        }

        let changesHtml = '';
        if (rel.changes.length === 0) {
          changesHtml = `
            <div class="changelog-change-row">
              <div class="changelog-change-content">
                <div class="spectrum-Body spectrum-Body--sizeM changelog-change-description">Maintenance release.</div>
              </div>
            </div>
          `;
        } else {
          changesHtml = rel.changes.map((c) => {
            const iconType = ALL_TYPES.find((item) => item.key === c.type)?.icon || 'new';
            const typeLabel = ALL_TYPES.find((item) => item.key === c.type)?.label || c.type;
            const moduleLabels = (c.modules || []).map((mId) => modulesMap[mId] || mId).filter(Boolean);
            const moduleHtml = moduleLabels.length > 0
              ? `<div class="spectrum-Detail spectrum-Detail--sizeS changelog-change-module">${renderMarkdown(moduleLabels.join(', '))}</div>`
              : '';

            const openBadge = c.open ? '<span class="changelog-badge changelog-badge-open">Still open</span>' : '';
            const actionHtml = c.action ? `
              <div class="changelog-what-to-do type-${c.type}">
                <strong class="what-to-do-title">What to do:</strong>
                <span>${renderMarkdown(c.action)}</span>
              </div>
            ` : '';

            return `
              <div class="changelog-change-row type-${c.type}">
                <div class="changelog-change-type-col">
                  <div class="spectrum-Body spectrum-Body--sizeS spectrum-Body-strong changelog-change-type type-${c.type}">
                    ${getIconSvg(iconType)} <span>${typeLabel}</span>
                  </div>
                  ${moduleHtml}
                </div>
                <div class="changelog-change-content">
                  <div class="spectrum-Body spectrum-Body--sizeM changelog-change-description">
                    ${renderMarkdown(c.text)}
                    ${openBadge}
                  </div>
                  ${actionHtml}
                </div>
              </div>
            `;
          }).join('');
        }

        const releaseHeading = rel.version
          ? (rel.title ? `${rel.version} · ${rel.title}` : rel.version)
          : (rel.title || kindsMap[rel.kind] || 'Docs update');

        releaseCard.innerHTML = `
          <div class="changelog-release-meta">
            <h3 class="spectrum-Heading spectrum-Heading--sizeS changelog-release-version">${releaseHeading}</h3>
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
    updateMonthSelectOptions();
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
    updateMonthSelectOptions();
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
