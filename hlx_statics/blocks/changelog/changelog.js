import { createTag, decorateInlineCodes } from '../../scripts/lib-adobeio.js';
import decoratePreformattedCode from '../../components/code.js';
import { fetchChangelog } from '../../scripts/lib-helix.js';

// Color map for standard changelog and Spectrum semantic colors
const COLOR_HEX_MAP = {
  red: '#D31510',
  orange: '#E68619',
  yellow: '#D48800',
  green: '#0A7C52',
  blue: '#0265DC',
  navy: '#001F5C',
  gray: '#6E6E6E',
  grey: '#6E6E6E',
};

// Month names and short abbreviations for date formatting and filtering
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Function to resolve authored color names or hex codes
function resolveColorHex(colorValue, fallbackHex = '#0265DC') {
  if (!colorValue) return fallbackHex;
  const normalized = String(colorValue).trim().toLowerCase();
  if (COLOR_HEX_MAP[normalized]) return COLOR_HEX_MAP[normalized];
  if (/^#|^rgb|^hsl/i.test(normalized)) return colorValue;
  if (/^[a-z]+$/i.test(normalized)) return normalized;
  return fallbackHex;
}

// Standard change types
const ALL_TYPES = [
  { key: 'breaking', label: 'Breaking', icon: 'breaking', color: 'red' },
  { key: 'removed', label: 'Removed', icon: 'removed', color: 'red' },
  { key: 'deprecated', label: 'Deprecated', icon: 'deprecated', color: 'orange' },
  { key: 'new', label: 'New', icon: 'new', color: 'blue' },
  { key: 'improved', label: 'Improved', icon: 'improved', color: 'blue' },
  { key: 'fixed', label: 'Fixed', icon: 'fixed', color: 'green' },
  { key: 'docs', label: 'Docs', icon: 'docs', color: 'grey' },
];

// Function to get inline SVG icons for change types and UI elements
function getIconSvg(changeType, customColor) {
  const defaultColors = {
    breaking: '#D31510',
    removed: '#D31510',
    deprecated: '#E68619',
    experimental: '#E68619',
    duplicate: '#D48800',
    new: '#0265DC',
    improved: '#0265DC',
    update: '#0265DC',
    fixed: '#0A7C52',
    docs: '#6E6E6E',
  };

  const color = customColor || defaultColors[changeType] || '#505050';

  const iconSvgs = {
    breaking: `<svg class="changelog-type-icon icon-breaking" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="${color}" d="M8 1l7 7-7 7-7-7z"/></svg>`,
    removed: `<svg class="changelog-type-icon icon-removed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="2" d="M8 2.5l5.5 5.5-5.5 5.5-5.5-5.5z"/></svg>`,
    deprecated: `<svg class="changelog-type-icon icon-deprecated" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="${color}" d="M8 2l7 12H1z"/></svg>`,
    new: `<svg class="changelog-type-icon icon-new" viewBox="0 0 16 16" width="9" height="9" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="${color}"/></svg>`,
    improved: `<svg class="changelog-type-icon icon-improved" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
    fixed: `<svg class="changelog-type-icon icon-fixed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.5 3.5 6.5-7"/></svg>`,
    docs: `<svg class="changelog-type-icon icon-docs" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 2v4h4"/></svg>`,
    update: `<svg class="changelog-type-icon icon-update" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M13 8a5 5 0 1 1-1-3M12 2v3H9"/></svg>`,
    chevron: '<svg class="changelog-chevron-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>',
    close: '<svg class="changelog-tag-close-icon" viewBox="0 0 36 36" width="9" height="9" aria-hidden="true" fill="currentColor"><path d="M26.485 6.686L18 15.172 9.515 6.686a1 1 0 0 0-1.414 0L6.686 8.1a1 1 0 0 0 0 1.414L15.172 18l-8.486 8.485a1 1 0 0 0 0 1.414L8.1 29.314a1 1 0 0 0 1.414 0L18 20.828l8.485 8.486a1 1 0 0 0 1.414 0l1.415-1.414a1 1 0 0 0 0-1.414L20.828 18l8.486-8.485a1 1 0 0 0 0-1.414L27.9 6.686a1 1 0 0 0-1.415 0z"/></svg>',
    filter: '<svg class="changelog-filters-header-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M1.5 2.5h13a.5.5 0 0 1 .38.82l-5.38 6.18V13.5a.5.5 0 0 1-.72.45l-2-1A.5.5 0 0 1 6.5 12.5V9.5L1.12 3.32a.5.5 0 0 1 .38-.82z"/></svg>',
    layers: '<svg class="changelog-label-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5l6 3.5-6 3.5-6-3.5 6-3.5z"/><path d="M2 8.5l6 3.5 6-3.5"/><path d="M2 12l6 3.5 6-3.5"/></svg>',
    calendar: '<svg class="changelog-label-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3.5" width="12" height="10.5" rx="2"/><path d="M2 7h12"/><path d="M5 2v3"/><path d="M11 2v3"/></svg>',
    tag: '<svg class="changelog-label-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8.5V2.5a1 1 0 0 1 1-1H8.5l6.5 6.5a1 1 0 0 1 0 1.41l-5.59 5.59a1 1 0 0 1-1.41 0L1.5 8.5z"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>',
    clock: '<svg class="changelog-badge-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.25"/><path d="M8 4.5V8l2.5 1.5"/></svg>',
    search: '<svg class="changelog-search-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4 4"/></svg>',
  };
  return iconSvgs[changeType] || `<svg class="changelog-type-icon icon-default" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z"/><circle cx="5" cy="5" r="1" fill="${color}"/></svg>`;
}

// Function to split raw change type string into tokens
function splitRawTypeTokens(rawType) {
  const list = Array.isArray(rawType) ? rawType : String(rawType || 'new').split(',');
  return list.map((item) => String(item).trim()).filter(Boolean);
}

// Function to normalize a type token to lowercase trimmed string
function normalizeTypeKey(token) {
  return String(token || '').trim().toLowerCase();
}

// Function to parse change types into deduplicated normalized keys
function parseChangeTypes(rawType) {
  const keys = splitRawTypeTokens(rawType).map(normalizeTypeKey).filter(Boolean);
  return keys.length > 0 ? Array.from(new Set(keys)) : ['new'];
}

// Function to format a type key into a human-readable display label
function formatTypeLabel(typeKey, rawToken = '') {
  if (rawToken && rawToken !== rawToken.toLowerCase()) return rawToken;
  return typeKey.split(/[-_\s]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Function to escape HTML characters
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Function to format inline code and text emphasis
function formatInlineCodeAndEmphasis(textFragment) {
  return textFragment
    .split(/(`[^`]+`)/g)
    .map((fragment) => {
      if (fragment.startsWith('`') && fragment.endsWith('`') && fragment.length >= 2) {
        return `<code>${escapeHtml(fragment.slice(1, -1))}</code>`;
      }
      return fragment
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
    })
    .join('');
}

// Function to format markdown prose segments including links
function formatMarkdownProse(proseText) {
  return proseText
    .split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
    .map((fragment) => {
      const linkMatch = !fragment.startsWith('`') && fragment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, linkLabel, linkUrl] = linkMatch;
        const isExternalLink = /^https?:\/\//i.test(linkUrl);
        const targetAttribute = isExternalLink ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${linkUrl}"${targetAttribute}>${formatInlineCodeAndEmphasis(linkLabel)}</a>`;
      }
      return formatInlineCodeAndEmphasis(fragment);
    })
    .join('');
}

// Function to format markdown blocks including unordered and ordered lists
function formatMarkdownBlock(blockText) {
  const lines = blockText.split(/\r?\n/);
  const output = [];
  let currentList = null;

  function flushList() {
    if (!currentList) return;
    const tag = currentList.type;
    const itemsHtml = currentList.items.map((item) => `<li>${formatMarkdownProse(item)}</li>`).join('');
    output.push(`<${tag} class="changelog-markdown-list">${itemsHtml}</${tag}>`);
    currentList = null;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (currentList && currentList.type !== 'ul') flushList();
      if (!currentList) currentList = { type: 'ul', items: [] };
      currentList.items.push(bulletMatch[2]);
    } else if (orderedMatch) {
      if (currentList && currentList.type !== 'ol') flushList();
      if (!currentList) currentList = { type: 'ol', items: [] };
      currentList.items.push(orderedMatch[2]);
    } else {
      flushList();
      if (line.trim()) {
        output.push(`<p>${formatMarkdownProse(line)}</p>`);
      }
    }
  }
  flushList();
  return output.join('');
}

// Function to render markdown text with fenced code blocks and lists
function renderMarkdown(markdownText) {
  if (!markdownText) return '';

  const rawText = String(markdownText);
  const segments = rawText.split(/(```[a-z0-9_-]*\r?\n[\s\S]*?```)/gi);
  const hasMultipleBlocks = segments.length > 1 || /\r?\n{2,}/.test(rawText);

  return segments.map((segment) => {
    const codeBlockMatch = segment.match(/^```([a-z0-9_-]*)\r?\n([\s\S]*?)```$/i);
    if (codeBlockMatch) {
      const [, language, codeContent] = codeBlockMatch;
      const languageClass = language ? ` class="language-${language.toLowerCase()}"` : '';
      return `<pre class="changelog-code-block"><code${languageClass}>${escapeHtml(codeContent.replace(/\r?\n$/, ''))}</code></pre>`;
    }

    const trimmedSegment = hasMultipleBlocks ? segment.replace(/^\r?\n+|\r?\n+$/g, '') : segment;
    if (!trimmedSegment) return '';

    const paragraphs = trimmedSegment.split(/\r?\n{2,}/);
    if (!hasMultipleBlocks && paragraphs.length === 1 && !/^\s*([*+-]|\d+\.)\s+/m.test(trimmedSegment)) {
      return formatMarkdownProse(trimmedSegment);
    }

    return paragraphs
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        if (/^\s*([*+-]|\d+\.)\s+/m.test(p)) {
          return formatMarkdownBlock(p);
        }
        return `<p>${formatMarkdownProse(p).replace(/\r?\n/g, '<br>')}</p>`;
      })
      .join('');
  }).join('');
}

// Function to build UTC date metadata
function buildUtcDateMetadata(utcDate, includeDay = true) {
  const year = String(utcDate.getUTCFullYear());
  const monthNumber = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const monthIdx = utcDate.getUTCMonth();
  const monthName = MONTH_NAMES[monthIdx] || '';
  const monthShort = MONTH_SHORT_NAMES[monthIdx] || '';

  if (!includeDay) {
    return {
      year,
      monthName,
      displayDate: `${monthName} ${year}`,
      rawDate: `${year}-${monthNumber}`,
    };
  }

  const dayNumber = String(utcDate.getUTCDate()).padStart(2, '0');
  const displayDate = `${monthShort} ${utcDate.getUTCDate()}, ${year}`;
  return {
    year,
    monthName,
    displayDate,
    rawDate: `${year}-${monthNumber}-${dayNumber}`,
  };
}

// Function to parse date strings into structured date metadata
function parseDate(dateString) {
  const trimmed = String(dateString || '').trim();
  if (!trimmed) {
    return { year: '', monthName: '', displayDate: '', rawDate: '' };
  }

  const isoDayMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDayMatch) {
    const [, y, m, d] = isoDayMatch;
    return buildUtcDateMetadata(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))), true);
  }

  const isoMonthMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMonthMatch) {
    const [, y, m] = isoMonthMatch;
    return buildUtcDateMetadata(new Date(Date.UTC(Number(y), Number(m) - 1, 1)), false);
  }

  const monthYearMatch = trimmed.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const prefix = monthYearMatch[1].toLowerCase().slice(0, 3);
    const monthIdx = MONTH_NAMES.findIndex((mn) => mn.toLowerCase().startsWith(prefix));
    if (monthIdx !== -1) {
      return buildUtcDateMetadata(new Date(Date.UTC(Number(monthYearMatch[2]), monthIdx, 1)), false);
    }
  }

  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return { year: yearOnlyMatch[1], monthName: '', displayDate: yearOnlyMatch[1], rawDate: yearOnlyMatch[1] };
  }

  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime())) {
    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
    return buildUtcDateMetadata(utcDate, true);
  }

  return { year: '', monthName: '', displayDate: trimmed, rawDate: trimmed };
}

// Function to find matching archive group for a release
function findMatchingArchiveGroup(releaseItem, archiveGroupsList) {
  if (!archiveGroupsList || !Array.isArray(archiveGroupsList) || archiveGroupsList.length === 0) {
    return null;
  }

  const { year: parsedYearString } = parseDate(releaseItem.date);
  const releaseYear = parsedYearString ? parseInt(parsedYearString, 10) : (releaseItem.date ? parseInt(String(releaseItem.date).slice(0, 4), 10) : null);

  for (let i = 0; i < archiveGroupsList.length; i += 1) {
    const groupDef = archiveGroupsList[i];
    const applies = groupDef?.applies_to;
    if (!applies) continue;

    if (applies.before_year && releaseYear !== null && !isNaN(releaseYear)) {
      if (releaseYear < parseInt(applies.before_year, 10)) {
        return groupDef;
      }
    }
  }

  return null;
}

// Function to parse raw changelog API payload
function parseChangelogPayload(rawChangelog) {
  if (!rawChangelog) return null;
  let parsedPayload = rawChangelog;
  if (typeof rawChangelog === 'string') {
    try {
      parsedPayload = JSON.parse(rawChangelog);
    } catch {
      return null;
    }
  }
  const rootNode = Array.isArray(parsedPayload?.data) ? parsedPayload.data[0] : parsedPayload;
  if (!rootNode) return null;
  return {
    parsedReleasesDocument: rootNode.data || rootNode,
    parsedReleasesMetadata: rootNode.settings || rootNode.metadata || {},
  };
}

// Function to create a Spectrum-styled single-select dropdown control
function createSingleSelectDropdown({
  id,
  labelText,
  labelIcon = null,
  allLabel = 'All',
  options = [],
  selectedValue = 'all',
  onChange,
}) {
  const group = createTag('div', { class: 'changelog-filter-group changelog-singleselect-group' });
  const label = createTag('label', {
    class: 'spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label',
    id: `${id}-label`,
    for: id,
  });
  if (labelIcon) {
    const iconSpan = createTag('span', { class: 'changelog-filter-label-icon', 'aria-hidden': 'true' });
    iconSpan.innerHTML = getIconSvg(labelIcon);
    label.append(iconSpan);
  }
  const textSpan = createTag('span', { class: 'changelog-filter-label-text' });
  textSpan.textContent = labelText;
  label.append(textSpan);

  const wrapper = createTag('div', { class: 'changelog-select-wrapper' });
  const select = createTag('select', {
    id,
    class: 'spectrum-Picker spectrum-Picker--sizeM changelog-filter-select',
    'aria-labelledby': `${id}-label`,
  });

  function populateOptions(opts, currentVal) {
    select.innerHTML = '';
    const allOpt = createTag('option', { value: 'all' });
    allOpt.textContent = allLabel;
    select.append(allOpt);

    opts.forEach((opt) => {
      const optEl = createTag('option', { value: opt.value });
      optEl.textContent = opt.text;
      if (opt.value === currentVal) optEl.selected = true;
      select.append(optEl);
    });
    select.value = currentVal;
  }

  populateOptions(options, selectedValue);

  select.addEventListener('change', (e) => {
    onChange(e.target.value);
  });

  const pickerIcon = createTag('span', { class: 'changelog-picker-icon', 'aria-hidden': 'true' });
  pickerIcon.innerHTML = getIconSvg('chevron');
  wrapper.append(select, pickerIcon);
  group.append(label, wrapper);

  return {
    group,
    select,
    setValue(val) {
      select.value = val;
    },
    updateOptions(newOpts, currentVal) {
      populateOptions(newOpts, currentVal);
    },
  };
}

// Function to create a Spectrum-styled multi-select dropdown control
function createMultiSelectDropdown({
  id,
  labelText,
  labelIcon = null,
  allLabel = 'All',
  options = [],
  selectedSet,
  maxVisibleTags = 3,
  entityName = 'items',
  onChange,
}) {
  let currentOptions = [...options];
  let isOpen = false;

  const group = createTag('div', { class: 'changelog-filter-group changelog-multiselect-group' });

  const label = createTag('label', {
    class: 'spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label',
    id: `${id}-label`,
    for: id,
  });
  if (labelIcon) {
    const labelIconSpan = createTag('span', { class: 'changelog-filter-label-icon', 'aria-hidden': 'true' });
    labelIconSpan.innerHTML = getIconSvg(labelIcon);
    label.append(labelIconSpan);
  }
  const labelTextSpan = createTag('span', { class: 'changelog-filter-label-text' });
  labelTextSpan.textContent = labelText;
  label.append(labelTextSpan);

  const wrapper = createTag('div', { class: 'changelog-multiselect-wrapper' });

  const trigger = createTag('button', {
    type: 'button',
    id,
    class: 'changelog-multiselect-trigger',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-labelledby': `${id}-label ${id}-trigger-text`,
  });

  const triggerText = createTag('span', {
    class: 'changelog-multiselect-trigger-text',
    id: `${id}-trigger-text`,
  });

  function updateTriggerLabel() {
    const selectedCount = selectedSet.size;

    if (isOpen) {
      triggerText.innerHTML = '';
      triggerText.textContent = `${selectedCount} ${entityName} selected`;
      trigger.setAttribute('value', Array.from(selectedSet).join(','));
      return;
    }

    if (selectedCount === 0) {
      triggerText.innerHTML = '';
      triggerText.textContent = allLabel;
      trigger.setAttribute('value', 'none');
      return;
    }

    triggerText.innerHTML = '';
    const selectedOptions = currentOptions.filter((opt) => selectedSet.has(opt.value));
    const visibleOptions = selectedOptions.slice(0, maxVisibleTags);
    const overflowCount = selectedOptions.length - visibleOptions.length;

    visibleOptions.forEach((opt) => {
      const tag = createTag('span', { class: 'changelog-trigger-tag', 'data-value': opt.value });
      const tagText = createTag('span');
      tagText.textContent = opt.text;

      const removeBtn = createTag('button', {
        type: 'button',
        class: 'changelog-trigger-tag-remove',
        'aria-label': `Remove ${opt.text}`,
      });
      removeBtn.innerHTML = getIconSvg('close');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        selectedSet.delete(opt.value);
        allCheckbox.checked = currentOptions.length > 0 && currentOptions.every((o) => selectedSet.has(o.value));
        optionCheckboxes.forEach(({ checkbox: cb, option: o }) => {
          cb.checked = selectedSet.has(o.value);
        });
        updateTriggerLabel();
        onChange(selectedSet);
      });

      tag.append(tagText, removeBtn);
      triggerText.append(tag);
    });

    if (overflowCount > 0) {
      const overflowBadge = createTag('span', { class: 'changelog-trigger-overflow-badge' });
      overflowBadge.textContent = `+${overflowCount}`;
      triggerText.append(overflowBadge);
    }

    trigger.setAttribute('value', Array.from(selectedSet).join(','));
  }

  const triggerIcon = createTag('span', { class: 'changelog-multiselect-trigger-icon', 'aria-hidden': 'true' });
  triggerIcon.innerHTML = getIconSvg('chevron');
  trigger.append(triggerText, triggerIcon);

  const popover = createTag('div', {
    class: 'changelog-multiselect-popover',
    role: 'listbox',
    'aria-multiselectable': 'true',
    hidden: true,
  });

  const searchBox = createTag('div', { class: 'changelog-multiselect-search' });
  const searchInput = createTag('input', {
    type: 'text',
    class: 'spectrum-Textfield-input changelog-multiselect-search-input',
    placeholder: `Search ${entityName}`,
    'aria-label': `Search ${entityName}`,
  });
  searchBox.append(searchInput);
  popover.append(searchBox);

  const allOption = createTag('label', { class: 'changelog-multiselect-option changelog-multiselect-option-all' });
  const allCheckbox = createTag('input', {
    type: 'checkbox',
    class: 'changelog-multiselect-checkbox',
    value: 'all',
  });
  allCheckbox.checked = currentOptions.length > 0 && currentOptions.every((opt) => selectedSet.has(opt.value));
  const allText = createTag('span', { class: 'changelog-multiselect-option-text' });
  allText.textContent = allLabel;
  allOption.append(allCheckbox, allText);
  popover.append(allOption);

  const divider = createTag('div', { class: 'changelog-multiselect-divider', role: 'separator' });
  popover.append(divider);

  const listContainer = createTag('div', { class: 'changelog-multiselect-options-list' });
  popover.append(listContainer);

  let optionCheckboxes = [];

  function populateOptionsList(opts) {
    listContainer.innerHTML = '';
    optionCheckboxes = [];

    opts.forEach((opt) => {
      const optionLabel = createTag('label', { class: 'changelog-multiselect-option' });
      const checkbox = createTag('input', {
        type: 'checkbox',
        class: 'changelog-multiselect-checkbox',
        value: opt.value,
      });
      checkbox.checked = selectedSet.has(opt.value);

      const optionSpan = createTag('span', { class: 'changelog-multiselect-option-text' });
      optionSpan.textContent = opt.text;
      optionLabel.append(checkbox, optionSpan);
      listContainer.append(optionLabel);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedSet.add(opt.value);
        } else {
          selectedSet.delete(opt.value);
        }
        allCheckbox.checked = currentOptions.length > 0 && currentOptions.every((o) => selectedSet.has(o.value));
        updateTriggerLabel();
        onChange(selectedSet);
      });

      optionCheckboxes.push({ checkbox, option: opt });
    });

    allCheckbox.checked = currentOptions.length > 0 && currentOptions.every((opt) => selectedSet.has(opt.value));
  }

  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked) {
      currentOptions.forEach((opt) => selectedSet.add(opt.value));
    } else {
      selectedSet.clear();
    }
    optionCheckboxes.forEach(({ checkbox: cb }) => {
      cb.checked = allCheckbox.checked;
    });
    updateTriggerLabel();
    onChange(selectedSet);
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    optionCheckboxes.forEach(({ checkbox: cb, option: opt }) => {
      const parentLabel = cb.closest('label');
      if (!parentLabel) return;
      parentLabel.hidden = query !== '' && !opt.text.toLowerCase().includes(query);
    });
  });

  function setOpen(open) {
    isOpen = open;
    trigger.setAttribute('aria-expanded', String(isOpen));
    popover.hidden = !isOpen;
    if (isOpen) {
      searchInput.value = '';
      populateOptionsList(currentOptions);
      if (typeof setTimeout !== 'undefined') {
        setTimeout(() => searchInput.focus?.(), 50);
      }
    }
    updateTriggerLabel();
  }

  trigger.addEventListener('click', () => setOpen(!isOpen));

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      if (isOpen && !group.contains(e.target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        setOpen(false);
        trigger.focus();
      }
    });
  }

  populateOptionsList(currentOptions);
  updateTriggerLabel();

  wrapper.append(trigger, popover);
  group.append(label, wrapper);

  return {
    group,
    update(newOptions, newSelectedSet) {
      if (newOptions) currentOptions = [...newOptions];
      if (newSelectedSet) selectedSet = newSelectedSet;
      populateOptionsList(currentOptions);
      updateTriggerLabel();
    },
  };
}

// Function to create the changelog header section
function createHeaderSection({ pageConfig, feedUrl, latestRelease }) {
  const header = createTag('header', { class: 'changelog-header' });
  const titleHeading = createTag('h1', { class: 'spectrum-Heading spectrum-Heading--sizeXL spectrum-Heading--light changelog-title' });
  titleHeading.textContent = pageConfig?.title;
  header.append(titleHeading);

  if (pageConfig?.description) {
    const desc = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXL changelog-description' });
    desc.textContent = pageConfig.description;
    header.append(desc);
  }

  const quickLinks = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeXL changelog-quick-links' });
  if (feedUrl) {
    const rssLink = createTag('a', {
      class: 'spectrum-Link changelog-quick-link changelog-rss-link',
      href: feedUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'Subscribe to RSS feed',
    });
    rssLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="6.18" cy="17.82" r="2.18" fill="#eb1000"></circle><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" fill="#eb1000"></path></svg> <span>Subscribe to RSS feed</span>';
    quickLinks.append(rssLink);
  }
  header.append(quickLinks);

  const subHeader = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-sub-header' });
  const latestInfo = createTag('span', { class: 'changelog-latest-info' });
  if (latestRelease && (latestRelease.version || latestRelease.title || latestRelease.date)) {
    const parts = [
      latestRelease.version ? `<strong>${latestRelease.version}</strong>` : (latestRelease.title ? `<strong>${latestRelease.title}</strong>` : ''),
      latestRelease.date,
    ].filter(Boolean);
    latestInfo.innerHTML = `Latest: ${parts.join(' · ')}`;
    subHeader.append(latestInfo);
    header.append(subHeader);
  }

  return header;
}

// Function to create the archive accordion section
function createArchiveSection({ configuredArchiveGroups, archiveGroupReleasesMap, archiveSectionLabel, archiveSectionDescription }) {
  const archiveSection = createTag('section', {
    class: 'changelog-archive-section',
    'aria-label': archiveSectionLabel,
  });

  const heading = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeL changelog-archive-title' });
  heading.textContent = archiveSectionLabel;
  archiveSection.append(heading);

  if (archiveSectionDescription) {
    const desc = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeM changelog-archive-description' });
    desc.textContent = archiveSectionDescription;
    archiveSection.append(desc);
  }

  configuredArchiveGroups.forEach((groupDef) => {
    const groupData = archiveGroupReleasesMap.get(groupDef.id);
    if (!groupData || groupData.releasesList.length === 0) return;

    const accordion = createTag('div', { class: 'changelog-accordion changelog-archive-group' });
    accordion.id = `changelog-archive-${groupDef.id}`;

    const trigger = createTag('button', {
      type: 'button',
      class: 'changelog-accordion-trigger',
      'aria-expanded': 'false',
      'aria-controls': `changelog-archive-content-${groupDef.id}`,
    });

    const left = createTag('div', { class: 'changelog-accordion-left' });
    const title = createTag('span', { class: 'spectrum-Heading spectrum-Heading--sizeM changelog-accordion-title' });
    title.textContent = groupDef.label;

    const count = createTag('span', { class: 'spectrum-Body spectrum-Body--sizeS changelog-accordion-count' });
    count.textContent = `(${groupData.releasesList.length})`;
    left.append(title, count);

    const arrow = createTag('span', { class: 'changelog-accordion-arrow', 'aria-hidden': 'true' });
    arrow.innerHTML = getIconSvg('chevron');
    trigger.append(left, arrow);

    const content = createTag('div', {
      id: `changelog-archive-content-${groupDef.id}`,
      class: 'changelog-accordion-content',
      hidden: true,
    });

    const list = createTag('div', { class: 'changelog-archive-list' });
    groupData.releasesList.forEach((rel) => {
      const item = createTag('div', { class: 'changelog-archive-item' });
      const meta = createTag('div', { class: 'changelog-archive-meta' });

      if (rel.version || rel.title) {
        const vHead = createTag('h3', { class: 'spectrum-Heading spectrum-Heading--sizeS changelog-archive-version' });
        vHead.textContent = rel.version || rel.title;
        meta.append(vHead);
      }

      if (rel.date) {
        const dSpan = createTag('span', { class: 'spectrum-Body spectrum-Body--sizeS changelog-archive-date' });
        dSpan.textContent = rel.date;
        meta.append(dSpan);
      }

      if (rel.breaking) {
        const bBadge = createTag('span', { class: 'changelog-badge changelog-badge-breaking' });
        bBadge.textContent = 'Breaking';
        meta.append(bBadge);
      }

      const descDiv = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeM changelog-archive-desc' });
      descDiv.innerHTML = renderMarkdown(rel.summary);

      item.append(meta, descDiv);
      list.append(item);
    });

    content.append(list);

    trigger.addEventListener('click', () => {
      const isExp = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isExp));
      content.hidden = isExp;
    });

    accordion.append(trigger, content);
    archiveSection.append(accordion);
  });

  archiveSection.querySelectorAll('pre').forEach((pre) => {
    decoratePreformattedCode(pre);
  });
  decorateInlineCodes(archiveSection);

  return archiveSection;
}

// Function to render a single release card
function renderReleaseCard({
  releaseItem,
  releaseIndex,
  yearKey,
  releaseKindsMap,
  defaultReleaseKind,
  filterState,
  availableTypes,
  configuredTypesMap,
  defaultTypesByKey,
  authoredTypeLabels,
  modulesMap,
}) {
  const cardSlug = String(releaseItem.title || releaseItem.kind || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const cardId = releaseItem.version
    ? releaseItem.version.replace(/\./g, '-')
    : (releaseItem.rawDate ? `docs-${releaseItem.rawDate}` : (cardSlug || `release-${yearKey || 'entry'}-${releaseIndex + 1}`));
  const releaseCard = createTag('article', { class: 'changelog-release-card', id: cardId });

  const releaseHeading = releaseItem.version
    ? (releaseItem.title ? `${releaseItem.version} · ${releaseItem.title}` : releaseItem.version)
    : (releaseItem.title || releaseKindsMap[releaseItem.kind] || 'Update');

  let badgeHtml = '';
  if (releaseItem.isLatest) {
    badgeHtml = '<span class="changelog-badge changelog-badge-latest">Latest</span>';
  } else if (releaseItem.kind) {
    const kindLabel = releaseKindsMap[releaseItem.kind] || releaseItem.kind;
    const isDefaultVersionedRelease = Boolean(
      defaultReleaseKind && releaseItem.version && releaseItem.kind === defaultReleaseKind,
    );
    const isFilteredBySameKind = filterState.types.has(String(releaseItem.kind).toLowerCase());
    if (!isDefaultVersionedRelease && !isFilteredBySameKind && kindLabel.toLowerCase() !== releaseHeading.toLowerCase()) {
      badgeHtml = `<span class="changelog-badge">${kindLabel}</span>`;
    }
  }

  const summaryHtml = releaseItem.summary
    ? `<div class="spectrum-Body spectrum-Body--sizeM changelog-release-summary">${renderMarkdown(releaseItem.summary)}</div>`
    : '';

  let changesHtml = '';
  if (releaseItem.changes.length === 0) {
    if (!releaseItem.summary) {
      changesHtml = `
        <div class="changelog-change-row">
          <div class="changelog-change-content">
            <div class="spectrum-Body spectrum-Body--sizeM changelog-change-description">Maintenance release.</div>
          </div>
        </div>
      `;
    }
  } else {
    changesHtml = releaseItem.changes.map((changeItem) => {
      const typeClassList = changeItem.types
        .map((typeKey) => `type-${typeKey.replace(/[^a-z0-9_-]/g, '-')}`)
        .join(' ');
      const typesHtml = changeItem.types.map((typeKey) => {
        const typeDefinition = availableTypes.find((item) => item.key === typeKey);
        const configuredType = configuredTypesMap[typeKey];
        const defaultType = defaultTypesByKey.get(typeKey);
        const iconType = typeDefinition?.icon || configuredType?.icon || defaultType?.icon || typeKey;
        const typeLabel = typeDefinition?.label
          || configuredType?.label
          || defaultType?.label
          || formatTypeLabel(typeKey, authoredTypeLabels.get(typeKey));
        const typeColor = typeDefinition?.color || configuredType?.color || defaultType?.color;
        const colorHex = resolveColorHex(typeColor, '#505050');
        const safeTypeClass = typeKey.replace(/[^a-z0-9_-]/g, '-');
        const isPillBadge = safeTypeClass === 'experimental' || safeTypeClass === 'api';
        const inlineColorStyle = isPillBadge ? '' : ` style="color: ${colorHex};"`;
        return `
          <div class="spectrum-Body spectrum-Body--sizeS spectrum-Body-strong changelog-change-type type-${safeTypeClass}"${inlineColorStyle}>
            ${getIconSvg(iconType, colorHex)} <span>${escapeHtml(typeLabel)}</span>
          </div>
        `;
      }).join('');

      const moduleLabels = (changeItem.modules || []).map((mId) => modulesMap[mId] || mId).filter(Boolean);
      const moduleHtml = moduleLabels.length > 0
        ? `<div class="spectrum-Detail spectrum-Detail--sizeS changelog-change-module">${renderMarkdown(moduleLabels.join(', '))}</div>`
        : '';

      const changeHeadingHtml = changeItem.heading
        ? `<h4 class="spectrum-Heading spectrum-Heading--sizeXS changelog-change-heading">${renderMarkdown(changeItem.heading)}</h4>`
        : '';
      const openBadgeHtml = changeItem.open ? '<span class="changelog-badge changelog-badge-open">Still open</span>' : '';
      const actionHtml = changeItem.action ? `
        <div class="changelog-what-to-do ${typeClassList}">
          <strong class="what-to-do-title">What to do:</strong>
          <span>${renderMarkdown(changeItem.action)}</span>
        </div>
      ` : '';

      let codeHtml = '';
      if (changeItem.code) {
        const rawCode = String(changeItem.code).trim();
        const codeLang = changeItem.language || 'js';
        if (rawCode.startsWith('<pre')) {
          let preHtml = rawCode.includes('<code')
            ? rawCode
            : rawCode.replace(/^<pre([^>]*)>([\s\S]*)<\/pre>$/i, '<pre$1><code>$2</code></pre>');
          if (!preHtml.includes('changelog-code-block')) {
            if (/^<pre[^>]*class="/i.test(preHtml)) {
              preHtml = preHtml.replace(/^<pre([^>]*)class="([^"]*)"/i, '<pre$1class="changelog-code-block $2"');
            } else {
              preHtml = preHtml.replace(/^<pre/i, '<pre class="changelog-code-block"');
            }
          }
          codeHtml = preHtml;
        } else if (rawCode.startsWith('```')) {
          codeHtml = renderMarkdown(rawCode);
        } else {
          codeHtml = `<pre class="changelog-code-block language-${codeLang}"><code class="language-${codeLang}">${escapeHtml(rawCode)}</code></pre>`;
        }
      }

      return `
        <div class="changelog-change-row ${typeClassList}">
          <div class="changelog-change-type-col">
            <div class="changelog-change-types">
              ${typesHtml}
            </div>
            ${moduleHtml}
          </div>
          <div class="changelog-change-content">
            ${changeHeadingHtml}
            <div class="spectrum-Body spectrum-Body--sizeM changelog-change-description">
              ${renderMarkdown(changeItem.text)}
              ${codeHtml}
              ${openBadgeHtml}
            </div>
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  const dateHtml = releaseItem.date
    ? `<time class="spectrum-Body spectrum-Body--sizeS changelog-release-date" datetime="${releaseItem.rawDate}">${releaseItem.date}</time>`
    : '';

  releaseCard.innerHTML = `
    <div class="changelog-release-meta">
      <h3 class="spectrum-Heading spectrum-Heading--sizeS changelog-release-version">${releaseHeading}</h3>
      ${dateHtml}
      ${badgeHtml}
    </div>
    <div class="changelog-release-changes">${summaryHtml}${changesHtml}</div>
  `;

  return releaseCard;
}

// Main decorate function to build the changelog component
export default async function decorate(block) {
  console.log("block", block.children)
  const rawChangelog = await fetchChangelog();
  const parsedPayload = null
  // const parsedPayload = parseChangelogPayload(rawChangelog);

  if (!parsedPayload) {
    // block.innerHTML = '<div class="changelog-empty-state"><p class="spectrum-Body spectrum-Body--sizeL changelog-empty-title">Unable to load changelog data.</p></div>';
    // return;
  }

  const { parsedReleasesDocument, parsedReleasesMetadata } = parsedPayload;
  const modulesMap = parsedReleasesDocument?.modules || {};
  const releaseKindsMap = parsedReleasesMetadata?.kinds || {};
  const archiveConfig = parsedReleasesMetadata?.archive;
  const isArchiveEnabled = Boolean(archiveConfig?.enabled);
  const configuredArchiveGroups = Array.isArray(archiveConfig?.groups) ? archiveConfig.groups : [];
  const archiveSectionLabel = archiveConfig?.label || '';
  const archiveSectionDescription = archiveConfig?.description || '';

  const archiveGroupReleasesMap = new Map();
  configuredArchiveGroups.forEach((groupDef) => {
    archiveGroupReleasesMap.set(groupDef.id, { groupDefinition: groupDef, releasesList: [] });
  });

  let totalArchivedReleasesCount = 0;
  const rawReleasesList = Array.isArray(parsedReleasesDocument?.releases) ? parsedReleasesDocument.releases : [];
  const defaultReleaseKind = parsedReleasesMetadata?.defaultKind || '';
  const pageConfig = parsedReleasesMetadata?.page;
  const feedUrl = pageConfig?.url;

  block.innerHTML = '';

  const releases = [];
  const authoredTypeLabels = new Map();

  rawReleasesList.forEach((releaseItem) => {
    const { year, monthName, displayDate, rawDate } = parseDate(releaseItem.date);
    const matchingArchiveGroup = isArchiveEnabled ? findMatchingArchiveGroup(releaseItem, configuredArchiveGroups) : null;

    if (matchingArchiveGroup && archiveGroupReleasesMap.has(matchingArchiveGroup.id)) {
      archiveGroupReleasesMap.get(matchingArchiveGroup.id).releasesList.push({
        version: releaseItem.version ? `v${String(releaseItem.version).replace(/^v/i, '')}` : '',
        date: displayDate || releaseItem.date,
        summary: releaseItem.summary || '',
        title: releaseItem.title || '',
        breaking: Boolean(releaseItem.breaking),
        rawDate,
      });
      totalArchivedReleasesCount += 1;
      return;
    }

    const isLatestRelease = releases.length === 0;
    const releaseChanges = Array.isArray(releaseItem.changes) ? releaseItem.changes.map((changeItem) => {
      splitRawTypeTokens(changeItem.type).forEach((rawToken) => {
        const normalizedKey = normalizeTypeKey(rawToken);
        if (normalizedKey && !authoredTypeLabels.has(normalizedKey)) {
          authoredTypeLabels.set(normalizedKey, rawToken);
        }
      });

      return {
        types: parseChangeTypes(changeItem.type),
        heading: changeItem.heading || '',
        modules: Array.isArray(changeItem.modules) ? changeItem.modules : (changeItem.modules ? [changeItem.modules] : []),
        text: changeItem.text || '',
        action: changeItem.action || '',
        code: changeItem.code || '',
        language: changeItem.language || 'js',
        open: Boolean(changeItem.open),
      };
    }) : [];

    releases.push({
      version: releaseItem.version || '',
      date: displayDate,
      rawDate,
      year,
      monthName,
      kind: releaseItem.kind || '',
      title: releaseItem.title || '',
      summary: releaseItem.summary || '',
      isLatest: isLatestRelease,
      changes: releaseChanges,
    });
  });

  const isFiltersDisabled = parsedReleasesMetadata?.filters === false;
  const hasConfiguredFilters = Array.isArray(parsedReleasesMetadata?.filters);
  const configuredFilters = hasConfiguredFilters ? parsedReleasesMetadata.filters : null;

  const isFilterConfigured = (filterId) => {
    if (isFiltersDisabled) return false;
    if (!hasConfiguredFilters) return true;
    return configuredFilters.some((f) => f.id === filterId && f.enabled !== false);
  };

  const typeFilterMetadata = (parsedReleasesMetadata?.filters || []).find((f) => f.id === 'type');
  const configuredTypesMap = { ...(parsedReleasesMetadata?.types || {}) };
  const defaultTypesByKey = new Map(ALL_TYPES.map((t) => [t.key, t]));

  const availableTypes = [];
  const addedTypeKeys = new Set();

  if (Array.isArray(typeFilterMetadata?.options)) {
    typeFilterMetadata.options.forEach((opt) => {
      const typeKey = normalizeTypeKey(opt.id);
      if (!typeKey || addedTypeKeys.has(typeKey)) return;

      const defType = defaultTypesByKey.get(typeKey);
      availableTypes.push({
        key: typeKey,
        label: opt.label || defType?.label || formatTypeLabel(typeKey, opt.id),
        icon: opt.icon || defType?.icon || typeKey,
        color: opt.color || defType?.color || '',
      });
      addedTypeKeys.add(typeKey);
    });
  } else {
    const hasAnyStandardType = ALL_TYPES.some((t) => authoredTypeLabels.has(t.key));
    ALL_TYPES.forEach((t) => {
      if (!hasAnyStandardType || authoredTypeLabels.has(t.key)) {
        const legacyType = configuredTypesMap[t.key];
        availableTypes.push({
          ...t,
          label: legacyType?.label || t.label,
          icon: legacyType?.icon || t.icon,
          color: legacyType?.color || t.color,
        });
        addedTypeKeys.add(t.key);
      }
    });
  }

  const moduleFilterMetadata = (parsedReleasesMetadata?.filters || []).find((f) => f.id === 'module');
  const yearFilterMetadata = (parsedReleasesMetadata?.filters || []).find((f) => f.id === 'year');
  const monthFilterMetadata = (parsedReleasesMetadata?.filters || []).find((f) => f.id === 'month');

  const moduleLabel = moduleFilterMetadata?.label || 'Module';
  const moduleAllLabel = moduleFilterMetadata?.allLabel || 'All modules';
  const yearLabel = yearFilterMetadata?.label || 'Year';
  const yearAllLabel = yearFilterMetadata?.allLabel || 'All years';
  const monthLabel = monthFilterMetadata?.label || 'Month';
  const monthAllLabel = monthFilterMetadata?.allLabel || 'All months';
  const typeLabel = typeFilterMetadata?.label || 'Type of change';
  const typeAllLabel = typeFilterMetadata?.allLabel || 'All types';

  const showModuleFilter = isFilterConfigured('module') && (
    Boolean(moduleFilterMetadata)
    || Object.keys(modulesMap).length > 0
    || releases.some((r) => r.changes.some((c) => c.modules.length > 0))
  );

  const showYearFilter = isFilterConfigured('year') && (
    Boolean(yearFilterMetadata)
    || releases.some((r) => Boolean(r.year))
  );

  const showMonthFilter = isFilterConfigured('month') && (
    Boolean(monthFilterMetadata)
    || releases.some((r) => Boolean(r.monthName))
  );

  const showTypeFilter = isFilterConfigured('type') && availableTypes.length > 0;

  let moduleOptions = [];
  if (showModuleFilter) {
    if (Array.isArray(moduleFilterMetadata?.options)) {
      moduleOptions = moduleFilterMetadata.options.map((opt) => ({
        value: opt.id,
        text: opt.label || modulesMap[opt.id] || opt.id,
      }));
    } else if (Object.keys(modulesMap).length > 0) {
      moduleOptions = Object.entries(modulesMap).map(([id, label]) => ({ value: id, text: label }));
    } else {
      const uniqueModuleIds = Array.from(new Set(releases.flatMap((r) => r.changes.flatMap((c) => c.modules)))).filter(Boolean);
      moduleOptions = uniqueModuleIds.map((id) => ({ value: id, text: id }));
    }
  }

  let yearOptions = [];
  if (showYearFilter) {
    const MIN_YEAR = 2024;
    const currentYear = new Date().getFullYear();
    const activeReleaseYears = releases
      .map((r) => parseInt(r.year, 10))
      .filter((y) => !isNaN(y));
    const maxYear = Math.max(currentYear, ...(activeReleaseYears.length ? activeReleaseYears : [currentYear]));

    const generatedYears = [];
    for (let y = maxYear; y >= MIN_YEAR; y -= 1) {
      generatedYears.push(String(y));
    }
    yearOptions = generatedYears;
  }

  const latestRelease = releases[0] || null;
  const filterState = {
    modules: new Set(),
    years: new Set(),
    months: new Set(),
    types: new Set(),
  };

  Object.defineProperty(filterState, 'module', {
    get() {
      if (moduleOptions.length > 0 && this.modules.size === moduleOptions.length) return 'all';
      if (this.modules.size === 0) return 'all';
      if (this.modules.size === 1) return Array.from(this.modules)[0];
      return Array.from(this.modules).join(',');
    },
    set(val) {
      this.modules.clear();
      if (!val || val === 'all') {
        moduleOptions.forEach((opt) => this.modules.add(opt.value));
      } else if (val !== 'none') {
        String(val).split(',').map((item) => item.trim()).filter(Boolean).forEach((id) => this.modules.add(id));
      }
    },
  });

  Object.defineProperty(filterState, 'year', {
    get() {
      if (yearOptions.length > 0 && this.years.size === yearOptions.length) return 'all';
      if (this.years.size === 0) return 'all';
      if (this.years.size === 1) return Array.from(this.years)[0];
      return Array.from(this.years).join(',');
    },
    set(val) {
      this.years.clear();
      if (!val || val === 'all') {
        yearOptions.forEach((yr) => this.years.add(yr));
      } else if (val !== 'none') {
        String(val).split(',').map((item) => item.trim()).filter(Boolean).forEach((yr) => this.years.add(yr));
      }
    },
  });

  function getMonthOptions() {
    if (!showMonthFilter) return [];
    return MONTH_NAMES.map((m) => ({ value: m, text: m }));
  }

  Object.defineProperty(filterState, 'month', {
    get() {
      const currentMonthOptions = getMonthOptions();
      if (currentMonthOptions.length > 0 && this.months.size === currentMonthOptions.length) return 'all';
      if (this.months.size === 0) return 'all';
      if (this.months.size === 1) return Array.from(this.months)[0];
      return Array.from(this.months).join(',');
    },
    set(val) {
      this.months.clear();
      if (!val || val === 'all') {
        getMonthOptions().forEach((opt) => this.months.add(opt.value));
      } else if (val !== 'none') {
        String(val).split(',').map((item) => item.trim()).filter(Boolean).forEach((mo) => this.months.add(mo));
      }
    },
  });

  // URL state management
  function readFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const modParam = params.get('module');
    const yrParam = params.get('year');
    const moParam = params.get('month');
    const typeParam = params.get('type');

    if (showYearFilter) {
      filterState.years.clear();
      if (yrParam && yrParam !== 'all') {
        if (yrParam !== 'none') {
          yrParam.split(',').forEach((yr) => {
            const trimmed = yr.trim();
            if (trimmed && yearOptions.includes(trimmed)) filterState.years.add(trimmed);
          });
        }
      } else {
        yearOptions.forEach((yr) => filterState.years.add(yr));
      }
    }

    if (showMonthFilter) {
      filterState.months.clear();
      if (moParam && moParam !== 'all') {
        if (moParam !== 'none') {
          moParam.split(',').forEach((mo) => {
            const trimmed = mo.trim();
            if (trimmed) filterState.months.add(trimmed);
          });
        }
      } else {
        getMonthOptions().forEach((opt) => filterState.months.add(opt.value));
      }
    }

    if (showModuleFilter) {
      filterState.modules.clear();
      if (modParam && modParam !== 'all') {
        if (modParam !== 'none') {
          modParam.split(',').forEach((modId) => {
            const trimmed = modId.trim();
            if (trimmed && moduleOptions.some((opt) => opt.value === trimmed)) filterState.modules.add(trimmed);
          });
        }
      } else {
        moduleOptions.forEach((opt) => filterState.modules.add(opt.value));
      }
    }

    if (showTypeFilter && typeParam) {
      filterState.types.clear();
      typeParam.split(',').forEach((typeKey) => {
        const normKey = normalizeTypeKey(typeKey);
        const matched = availableTypes.find((t) => t.key === normKey);
        if (matched) filterState.types.add(matched.key);
      });
    }
  }

  function writeToUrl() {
    const params = new URLSearchParams(window.location.search);

    const isAllModules = !showModuleFilter || moduleOptions.length === 0 || filterState.modules.size === 0 || filterState.modules.size === moduleOptions.length;
    if (showModuleFilter && !isAllModules) {
      params.set('module', Array.from(filterState.modules).join(','));
    } else {
      params.delete('module');
    }

    const isAllYears = !showYearFilter || yearOptions.length === 0 || filterState.years.size === 0 || filterState.years.size === yearOptions.length;
    if (showYearFilter && !isAllYears) {
      params.set('year', Array.from(filterState.years).join(','));
    } else {
      params.delete('year');
    }

    const currentMonthOptions = getMonthOptions();
    const isAllMonths = !showMonthFilter || currentMonthOptions.length === 0 || filterState.months.size === 0 || filterState.months.size === currentMonthOptions.length;
    if (showMonthFilter && !isAllMonths) {
      params.set('month', Array.from(filterState.months).join(','));
    } else {
      params.delete('month');
    }

    if (showTypeFilter && filterState.types.size > 0) {
      params.set('type', Array.from(filterState.types).join(','));
    } else {
      params.delete('type');
    }

    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }

  readFromUrl();

  const container = createTag('div', { class: 'changelog-container' });

  // 1. Header Section
  const headerSection = createHeaderSection({ pageConfig, feedUrl, latestRelease });

  // 2. Filter Card
  const filterCard = createTag('section', { id: 'filters', class: 'changelog-filter-card', 'aria-label': 'Changelog filters' });

  const filterCardHeader = createTag('div', { class: 'changelog-filter-card-header' });
  const filterCardTitle = createTag('div', { class: 'changelog-filters-header-title' });
  filterCardTitle.innerHTML = `${getIconSvg('filter')} <span>Filters</span>`;

  const summaryRow = createTag('div', { class: 'changelog-filter-summary-row' });
  const summaryText = createTag('span', { class: 'spectrum-Body spectrum-Body--sizeS changelog-filter-summary-text', 'aria-live': 'polite' });
  const clearFiltersButton = createTag('button', { type: 'button', class: 'spectrum-Link changelog-clear-link' });
  clearFiltersButton.textContent = 'Clear filters';
  clearFiltersButton.addEventListener('click', clearAllFilters);
  summaryRow.append(summaryText, clearFiltersButton);

  filterCardHeader.append(filterCardTitle, summaryRow);
  filterCard.append(filterCardHeader);

  const dropdownRow = createTag('div', { class: 'changelog-filter-row-dropdowns' });
  const pillRows = [];

  let moduleMultiSelect = null;
  let moduleSingleSelect = null;
  if (showModuleFilter) {
    const isSingle = moduleFilterMetadata?.control === 'select';
    if (isSingle) {
      moduleSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-module',
        labelText: moduleLabel,
        labelIcon: 'layers',
        allLabel: moduleAllLabel,
        options: moduleOptions,
        selectedValue: filterState.module,
        onChange: (val) => {
          filterState.module = val;
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(moduleSingleSelect.group);
    } else {
      moduleMultiSelect = createMultiSelectDropdown({
        id: 'changelog-filter-module',
        labelText: moduleLabel,
        labelIcon: 'layers',
        allLabel: moduleAllLabel,
        options: moduleOptions,
        selectedSet: filterState.modules,
        maxVisibleTags: 3,
        entityName: 'modules',
        onChange: () => {
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(moduleMultiSelect.group);
    }
  }

  let yearMultiSelect = null;
  let yearSingleSelect = null;
  if (showYearFilter) {
    const isSingle = yearFilterMetadata?.control === 'select';
    if (isSingle) {
      yearSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-year',
        labelText: yearLabel,
        labelIcon: 'calendar',
        allLabel: yearAllLabel,
        options: yearOptions.map((y) => ({ value: y, text: y })),
        selectedValue: filterState.year,
        onChange: (val) => {
          filterState.year = val;
          updateMonthControlOptions();
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(yearSingleSelect.group);
    } else {
      yearMultiSelect = createMultiSelectDropdown({
        id: 'changelog-filter-year',
        labelText: yearLabel,
        labelIcon: 'calendar',
        allLabel: yearAllLabel,
        options: yearOptions.map((y) => ({ value: y, text: y })),
        selectedSet: filterState.years,
        maxVisibleTags: 3,
        entityName: 'years',
        onChange: () => {
          updateMonthControlOptions();
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(yearMultiSelect.group);
    }
  }

  let monthMultiSelect = null;
  let monthSingleSelect = null;
  if (showMonthFilter) {
    const isSingle = monthFilterMetadata?.control === 'select';
    if (isSingle) {
      monthSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-month',
        labelText: monthLabel,
        labelIcon: 'calendar',
        allLabel: monthAllLabel,
        options: getMonthOptions(),
        selectedValue: filterState.month,
        onChange: (val) => {
          filterState.month = val;
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(monthSingleSelect.group);
    } else {
      monthMultiSelect = createMultiSelectDropdown({
        id: 'changelog-filter-month',
        labelText: monthLabel,
        labelIcon: 'calendar',
        allLabel: monthAllLabel,
        options: getMonthOptions(),
        selectedSet: filterState.months,
        maxVisibleTags: 2,
        entityName: 'months',
        onChange: () => {
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(monthMultiSelect.group);
    }
  }

  let typePillsContainer = null;
  if (showTypeFilter) {
    const typeRow = createTag('div', { class: 'changelog-filter-row-types' });
    typeRow.innerHTML = `<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label"><span class="changelog-filter-label-icon" aria-hidden="true">${getIconSvg('tag')}</span><span class="changelog-filter-label-text">${escapeHtml(typeLabel)}</span></div>`;
    typePillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': 'Filter by change type' });
    typeRow.append(typePillsContainer);
    pillRows.push(typeRow);
  }

  if (dropdownRow.children.length > 0) filterCard.append(dropdownRow);
  pillRows.forEach((pillRow) => filterCard.append(pillRow));

  // 3. Dynamic Archive section
  const archiveSection = (isArchiveEnabled && totalArchivedReleasesCount > 0)
    ? createArchiveSection({ configuredArchiveGroups, archiveGroupReleasesMap, archiveSectionLabel, archiveSectionDescription })
    : null;

  const resultsContainer = createTag('div', { class: 'changelog-results', role: 'region', 'aria-live': 'polite' });

  function updateMonthControlOptions() {
    if (monthMultiSelect) {
      monthMultiSelect.update(getMonthOptions());
    }
    if (monthSingleSelect) {
      monthSingleSelect.updateOptions(getMonthOptions(), filterState.month);
    }
  }

  function matchesYear(releaseItem) {
    if (!showYearFilter || yearOptions.length === 0 || filterState.years.size === yearOptions.length) return true;
    if (filterState.years.size === 0) return false;
    return filterState.years.has(releaseItem.year);
  }

  function matchesMonth(releaseItem) {
    if (!showMonthFilter) return true;
    const currentOpts = getMonthOptions();
    if (currentOpts.length === 0 || filterState.months.size === currentOpts.length) return true;
    if (filterState.months.size === 0) return false;
    return filterState.months.has(releaseItem.monthName);
  }

  // Filtering & Rendering logic
  function getFilteredData() {
    const isAllModules = !showModuleFilter || moduleOptions.length === 0 || filterState.modules.size === moduleOptions.length;
    const isAllTypes = !showTypeFilter || filterState.types.size === 0;

    let totalMatchingChanges = 0;
    const changeTypeCounts = {};
    availableTypes.forEach((t) => { changeTypeCounts[t.key] = 0; });

    const matchingReleases = [];

    releases.forEach((releaseItem) => {
      if (!matchesYear(releaseItem) || !matchesMonth(releaseItem)) return;

      const matchingChanges = releaseItem.changes.filter((changeItem) => {
        const modMatch = isAllModules
          || (filterState.modules.size > 0 && changeItem.modules.some((m) => filterState.modules.has(m)));
        if (!modMatch) return false;

        changeItem.types.forEach((tk) => {
          if (changeTypeCounts[tk] !== undefined) changeTypeCounts[tk] += 1;
        });

        return isAllTypes || changeItem.types.some((tk) => filterState.types.has(tk));
      });

      if (matchingChanges.length > 0) {
        totalMatchingChanges += matchingChanges.length;
        matchingReleases.push({
          ...releaseItem,
          changes: matchingChanges,
        });
      }
    });

    return { matchingReleases, totalMatchingChanges, changeTypeCounts };
  }

  function renderPills(changeTypeCounts, totalMatchingChanges) {
    if (!typePillsContainer) return;
    typePillsContainer.innerHTML = '';

    const allPill = createTag('button', {
      type: 'button',
      class: 'changelog-pill',
      'aria-pressed': filterState.types.size === 0 ? 'true' : 'false',
    });
    if (filterState.types.size === 0) allPill.classList.add('is-selected');

    const allPillText = typeAllLabel;
    allPill.innerHTML = `<span>${escapeHtml(allPillText)}</span> <span class="changelog-pill-count">${totalMatchingChanges}</span>`;
    allPill.addEventListener('click', () => {
      filterState.types.clear();
      writeToUrl();
      applyFilters();
    });
    typePillsContainer.append(allPill);

    availableTypes.forEach((typeDef) => {
      const isSelected = filterState.types.has(typeDef.key);
      const safeKey = typeDef.key.replace(/[^a-z0-9_-]/g, '-');
      const typePill = createTag('button', {
        type: 'button',
        class: `changelog-pill type-pill-${safeKey}`,
        'aria-pressed': isSelected ? 'true' : 'false',
        'data-type': typeDef.key,
      });
      if (isSelected) typePill.classList.add('is-selected');

      const color = resolveColorHex(typeDef.color, '#505050');
      typePill.innerHTML = `${getIconSvg(typeDef.icon, color)} <span>${escapeHtml(typeDef.label)}</span> <span class="changelog-pill-count">${changeTypeCounts[typeDef.key] || 0}</span>`;

      typePill.addEventListener('click', () => {
        if (filterState.types.has(typeDef.key)) {
          filterState.types.delete(typeDef.key);
        } else {
          filterState.types.add(typeDef.key);
        }
        writeToUrl();
        applyFilters();
      });
      typePillsContainer.append(typePill);
    });
  }

  function renderReleasesList(matchingReleases) {
    resultsContainer.innerHTML = '';
    if (matchingReleases.length === 0) {
      resultsContainer.innerHTML = `
        <div class="changelog-empty-state">
          <p class="spectrum-Body spectrum-Body--sizeL changelog-empty-title">No changes match the selected filters.</p>
          <button type="button" class="spectrum-Button spectrum-Button--secondary spectrum-Button--sizeM changelog-empty-clear">
            <span class="spectrum-Button-label">Clear filters</span>
          </button>
        </div>
      `;
      const clearBtn = resultsContainer.querySelector('button');
      if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
      return;
    }

    const releasesByYear = new Map();
    matchingReleases.forEach((rel) => {
      const yearKey = rel.year || '';
      if (!releasesByYear.has(yearKey)) releasesByYear.set(yearKey, []);
      releasesByYear.get(yearKey).push(rel);
    });

    const isMultiYear = releasesByYear.size > 1 || Array.from(releasesByYear.keys())[0] !== '';

    releasesByYear.forEach((yearReleases, yearKey) => {
      const yearSection = createTag('section', {
        class: 'changelog-year-section',
        'aria-label': yearKey ? `Releases in ${yearKey}` : 'Releases',
      });

      if (isMultiYear && yearKey) {
        const yearHeading = createTag('h2', {
          id: `year-${yearKey}`,
          class: 'spectrum-Heading spectrum-Heading--sizeXL changelog-year-heading',
        });
        yearHeading.textContent = yearKey;
        yearSection.append(yearHeading);
      }

      const tableHeader = createTag('div', { class: 'changelog-table-header', role: 'row', 'aria-hidden': 'true' });
      const versionHeader = createTag('div', { class: 'changelog-header-col changelog-header-col-version' });
      versionHeader.textContent = 'Version';

      const changesWrapper = createTag('div', { class: 'changelog-header-changes' });
      const typeHeader = createTag('div', { class: 'changelog-header-col changelog-header-col-type' });
      typeHeader.textContent = 'Type of change';

      const descHeader = createTag('div', { class: 'changelog-header-col changelog-header-col-desc' });
      descHeader.textContent = 'Description';

      changesWrapper.append(typeHeader, descHeader);
      tableHeader.append(versionHeader, changesWrapper);
      yearSection.append(tableHeader);

      const releaseList = createTag('div', { class: 'changelog-release-list' });

      yearReleases.forEach((releaseItem, releaseIndex) => {
        const releaseCard = renderReleaseCard({
          releaseItem,
          releaseIndex,
          yearKey,
          releaseKindsMap,
          defaultReleaseKind,
          filterState,
          availableTypes,
          configuredTypesMap,
          defaultTypesByKey,
          authoredTypeLabels,
          modulesMap,
        });
        releaseList.appendChild(releaseCard);
      });

      yearSection.appendChild(releaseList);
      resultsContainer.appendChild(yearSection);
    });

    resultsContainer.querySelectorAll('pre').forEach((pre) => {
      decoratePreformattedCode(pre);
    });
    decorateInlineCodes(resultsContainer);
    if (typeof window !== 'undefined' && window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
      window.Prism.highlightAllUnder(resultsContainer);
    }
  }

  function updateSummary(totalMatchingChanges, matchingReleasesCount) {
    const isAllModules = !showModuleFilter || moduleOptions.length === 0 || filterState.modules.size === moduleOptions.length;
    const isAllYears = !showYearFilter || yearOptions.length === 0 || filterState.years.size === yearOptions.length;
    const currentMonthOptions = getMonthOptions();
    const isAllMonths = !showMonthFilter || currentMonthOptions.length === 0 || filterState.months.size === currentMonthOptions.length;
    const isAllTypes = !showTypeFilter || filterState.types.size === 0;

    const isFiltered = !isAllModules || !isAllYears || !isAllMonths || !isAllTypes;

    const changesText = `${totalMatchingChanges} ${totalMatchingChanges === 1 ? 'change' : 'changes'}`;
    const releasesText = `${matchingReleasesCount} ${matchingReleasesCount === 1 ? 'release' : 'releases'}`;
    const releasesBadge = `<span class="changelog-summary-badge changelog-summary-badge-releases">${getIconSvg('layers')}<span>${releasesText}</span></span>`;
    const olderBadge = isArchiveEnabled && totalArchivedReleasesCount > 0
      ? `<span class="changelog-summary-badge changelog-summary-badge-older">${getIconSvg('clock')}<span>${totalArchivedReleasesCount} ${archiveSectionLabel.toLowerCase()}</span></span>`
      : '';

    summaryText.innerHTML = `<span class="changelog-summary-results-text">Results: <strong>${changesText}</strong></span><span class="changelog-summary-divider" aria-hidden="true"></span>${releasesBadge}${olderBadge}`;
    if (clearFiltersButton) {
      clearFiltersButton.hidden = !isFiltered;
    }
  }

  function clearAllFilters() {
    filterState.modules.clear();
    moduleOptions.forEach((opt) => filterState.modules.add(opt.value));

    filterState.years.clear();
    yearOptions.forEach((yr) => filterState.years.add(yr));

    filterState.months.clear();
    getMonthOptions().forEach((opt) => filterState.months.add(opt.value));

    filterState.types.clear();

    if (moduleMultiSelect) moduleMultiSelect.update();
    if (moduleSingleSelect) moduleSingleSelect.setValue('all');
    if (yearMultiSelect) yearMultiSelect.update();
    if (yearSingleSelect) yearSingleSelect.setValue('all');
    updateMonthControlOptions();
    if (monthMultiSelect) monthMultiSelect.update();
    if (monthSingleSelect) monthSingleSelect.setValue('all');

    writeToUrl();
    applyFilters();
  }

  function applyFilters() {
    const { matchingReleases, totalMatchingChanges, changeTypeCounts } = getFilteredData();
    renderPills(changeTypeCounts, totalMatchingChanges);
    renderReleasesList(matchingReleases);
    updateSummary(totalMatchingChanges, matchingReleases.length);
  }

  applyFilters();

  const hasAnyVisibleFilters = showModuleFilter || showYearFilter || showMonthFilter || showTypeFilter;
  if (hasAnyVisibleFilters) {
    container.append(headerSection, filterCard, resultsContainer);
  } else {
    container.append(headerSection, resultsContainer);
  }
  if (archiveSection) container.append(archiveSection);
  block.append(container);
}
