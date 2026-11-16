import { createTag } from '../../scripts/lib-adobeio.js';
import { fetchChangelog } from '../../scripts/lib-helix.js';

const COLOR_PALETTE = {
  // Standard changelog / Spectrum semantic colors
  red: '#D31510',
  orange: '#E68619',
  yellow: '#D48800',
  blue: '#0265DC',
  green: '#0A7C52',
  grey: '#6E6E6E',
  gray: '#6E6E6E',
};

function resolveColorHex(colorValue, fallbackHex = '#0265DC') {
  if (!colorValue) return fallbackHex;
  const normalized = String(colorValue).trim().toLowerCase();
  if (COLOR_PALETTE[normalized]) {
    return COLOR_PALETTE[normalized];
  }
  if (/^#|^rgb|^hsl/i.test(normalized)) {
    return colorValue;
  }
  // Allow any valid CSS color keyword
  if (/^[a-z]+$/i.test(normalized)) {
    return normalized;
  }
  return fallbackHex;
}

const ALL_TYPES = [
  { key: 'breaking', label: 'Breaking', icon: 'breaking', color: 'red' },
  { key: 'removed', label: 'Removed', icon: 'removed', color: 'red' },
  { key: 'deprecated', label: 'Deprecated', icon: 'deprecated', color: 'orange' },
  { key: 'new', label: 'New', icon: 'new', color: 'blue' },
  { key: 'improved', label: 'Improved', icon: 'improved', color: 'blue' },
  { key: 'fixed', label: 'Fixed', icon: 'fixed', color: 'green' },
  { key: 'docs', label: 'Docs', icon: 'docs', color: 'grey' },
];

/**
 * Return inline SVG icons for change types and UI elements.
 * @param {string} changeType Type key
 * @param {string} [customColor] Optional override hex color
 */
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
    experimental: `<svg class="changelog-type-icon icon-experimental" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 2h4M7 2v3.5L3 13a1 1 0 0 0 .9 1.5h8.2a1 1 0 0 0 .9-1.5L9 5.5V2"/></svg>`,
    api: `<svg class="changelog-type-icon icon-api" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 2h4M7 2v3.5L3 13a1 1 0 0 0 .9 1.5h8.2a1 1 0 0 0 .9-1.5L9 5.5V2"/></svg>`,
    test: `<svg class="changelog-type-icon icon-test" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 2h4M7 2v3.5L3 13a1 1 0 0 0 .9 1.5h8.2a1 1 0 0 0 .9-1.5L9 5.5V2"/><path fill="${color}" opacity="0.35" d="M4.6 11l1.5-3.5h3.8l1.5 3.5H4.6z"/></svg>`,
    duplicate: `<svg class="changelog-type-icon icon-duplicate" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><rect x="5" y="5" width="8" height="8" rx="1.5" fill="none" stroke="${color}" stroke-width="1.6"/><path fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></svg>`,
    new: `<svg class="changelog-type-icon icon-new" viewBox="0 0 16 16" width="9" height="9" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="${color}"/></svg>`,
    improved: `<svg class="changelog-type-icon icon-improved" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
    fixed: `<svg class="changelog-type-icon icon-fixed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.5 3.5 6.5-7"/></svg>`,
    docs: `<svg class="changelog-type-icon icon-docs" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 2v4h4"/></svg>`,
    update: `<svg class="changelog-type-icon icon-update" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M13 8a5 5 0 1 1-1-3M12 2v3H9"/></svg>`,
    chevron: '<svg class="changelog-chevron-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>',
  };
  const defaultIcon = `<svg class="changelog-type-icon icon-default" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z"/><circle cx="5" cy="5" r="1" fill="${color}"/></svg>`;
  return iconSvgs[changeType] || defaultIcon;
}

/**
 * Splits a comma-separated change type string or array into trimmed tokens.
 * @param {string|string[]|null|undefined} rawType Raw change type value
 * @returns {string[]}
 */
function splitRawTypeTokens(rawType) {
  const rawTypeList = Array.isArray(rawType)
    ? rawType
    : String(rawType || 'new').split(',');

  return rawTypeList
    .map((typeValue) => String(typeValue).trim())
    .filter(Boolean);
}

/**
 * Normalizes a raw change type token to a canonical hyphenated key.
 * @param {string} rawToken Raw change type token
 * @returns {string}
 */
function normalizeTypeKey(rawToken) {
  return String(rawToken || '')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Splits a comma-separated change type string or array into normalized, deduplicated type keys.
 * @param {string|string[]|null|undefined} rawType Raw change type value
 * @returns {string[]}
 */
function parseChangeTypes(rawType) {
  const normalizedTypes = splitRawTypeTokens(rawType).map(normalizeTypeKey).filter(Boolean);
  return normalizedTypes.length > 0 ? Array.from(new Set(normalizedTypes)) : ['new'];
}

/**
 * Formats a type key into a display label, preserving authored casing when available.
 * @param {string} typeKey Normalized type key
 * @param {string} [rawToken] Original authored token
 * @returns {string}
 */
function formatTypeLabel(typeKey, rawToken = '') {
  if (rawToken && rawToken !== rawToken.toLowerCase()) {
    return rawToken;
  }
  return typeKey
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parses changelog JSON response 
 */
function parseChangelogPayload(rawChangelog) {
  if (!rawChangelog) {
    return null;
  }

  let parsedPayload = rawChangelog;
  if (typeof rawChangelog === 'string') {
    try {
      parsedPayload = JSON.parse(rawChangelog);
    } catch (error) {
      console.error('Failed to parse changelog JSON:', error);
      return null;
    }
  }

  const changelogEntry = parsedPayload?.data?.[0];
  if (!changelogEntry) {
    return null;
  }

  return {
    parsedReleasesDocument: changelogEntry.data,
    parsedReleasesMetadata: changelogEntry.settings,
  };
}

/**
 * Escapes HTML special characters in plain text snippets such as code blocks.
 * @param {string} text Plain text input
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Formats inline code (`code`), bold (**text** or __text__), and italic (*text* or _text_) in a prose fragment.
 */
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

/**
 * Formats markdown prose segments (inline code, links, bold, italic).
 */
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

/**
 * Parses bullet lists (- item, * item) and numbered lists (1. item) within a text block.
 */
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
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[2]);
    } else if (orderedMatch) {
      if (currentList && currentList.type !== 'ol') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
    } else {
      flushList();
      if (line.trim().length > 0) {
        output.push(formatMarkdownProse(line));
      }
    }
  }

  flushList();
  return output.join('<br>');
}

/**
 * Format markdown fenced code blocks (```lang ... ```), inline code (`code`),
 * bold (**text**), italic (*text*), links ([text](url)), lists (bullet & numbered), and paragraphs.
 */
function renderMarkdown(markdownText) {
  if (!markdownText) {
    return '';
  }

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
    if (!trimmedSegment) {
      return '';
    }

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

/**
 * Formats a UTC Date safely into structured date metadata.
 */
function buildUtcDateMetadata(utcDate, includeDay = true) {
  const year = String(utcDate.getUTCFullYear());
  const monthNumber = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const monthName = utcDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });

  if (!includeDay) {
    return {
      year,
      monthName,
      displayDate: `${monthName} ${year}`,
      rawDate: `${year}-${monthNumber}`,
    };
  }

  const dayNumber = String(utcDate.getUTCDate()).padStart(2, '0');
  const displayDate = utcDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return {
    year,
    monthName,
    displayDate,
    rawDate: `${year}-${monthNumber}-${dayNumber}`,
  };
}

/**
 * Parses date string (ISO YYYY-MM-DD, YYYY-MM, Month YYYY, YYYY, or fallback) into structured date metadata.
 */
function parseDate(dateString) {
  const trimmedDateString = (dateString || '').trim();
  if (!trimmedDateString) {
    return { year: '', monthName: '', displayDate: '', rawDate: '' };
  }

  const isoDateMatch = trimmedDateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return buildUtcDateMetadata(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))), true);
  }

  const isoMonthMatch = trimmedDateString.match(/^(\d{4})-(\d{2})$/);
  if (isoMonthMatch) {
    const [, year, month] = isoMonthMatch;
    return buildUtcDateMetadata(new Date(Date.UTC(Number(year), Number(month) - 1, 1)), false);
  }

  const monthYearMatch = trimmedDateString.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const parsedTimestamp = Date.parse(`${monthYearMatch[1]} 1, ${monthYearMatch[2]} UTC`);
    if (!isNaN(parsedTimestamp)) {
      return buildUtcDateMetadata(new Date(parsedTimestamp), false);
    }
  }

  const yearOnlyMatch = trimmedDateString.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    return { year: yearOnlyMatch[1], monthName: '', displayDate: yearOnlyMatch[1], rawDate: yearOnlyMatch[1] };
  }

  const parsedDate = new Date(trimmedDateString);
  if (!isNaN(parsedDate.getTime())) {
    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
    return buildUtcDateMetadata(utcDate, true);
  }

  return { year: '', monthName: '', displayDate: trimmedDateString, rawDate: trimmedDateString };
}

/**
 * Compares two semantic version strings.
 * Returns 1 if firstVersion > secondVersion, -1 if firstVersion < secondVersion, and 0 if equal.
 */
function compareSemver(firstVersionString, secondVersionString) {
  const cleanFirstVersion = String(firstVersionString || '').replace(/^v/i, '').trim();
  const cleanSecondVersion = String(secondVersionString || '').replace(/^v/i, '').trim();
  const firstVersionParts = cleanFirstVersion.split('.').map((versionSegment) => parseInt(versionSegment, 10) || 0);
  const secondVersionParts = cleanSecondVersion.split('.').map((versionSegment) => parseInt(versionSegment, 10) || 0);
  const maximumPartsLength = Math.max(firstVersionParts.length, secondVersionParts.length);

  for (let segmentIndex = 0; segmentIndex < maximumPartsLength; segmentIndex += 1) {
    const firstSegmentNumber = firstVersionParts[segmentIndex] || 0;
    const secondSegmentNumber = secondVersionParts[segmentIndex] || 0;
    if (firstSegmentNumber > secondSegmentNumber) {
      return 1;
    }
    if (firstSegmentNumber < secondSegmentNumber) {
      return -1;
    }
  }
  return 0;
}

/**
 * Checks whether a given semantic version string matches a version range expression (e.g. '<4.0.0', '<=2.0.0', '>=1.0.0').
 */
function matchesVersionRange(versionString, versionRangeExpression) {
  if (!versionString || !versionRangeExpression) {
    return false;
  }
  const rangeMatchResult = String(versionRangeExpression).trim().match(/^([<>]=?|=)?\s*(.*)$/);
  if (!rangeMatchResult) {
    return false;
  }

  const comparisonOperator = rangeMatchResult[1] || '<';
  const semverComparisonResult = compareSemver(versionString, rangeMatchResult[2]);

  if (comparisonOperator === '<') {
    return semverComparisonResult < 0;
  }
  if (comparisonOperator === '<=') {
    return semverComparisonResult <= 0;
  }
  if (comparisonOperator === '>') {
    return semverComparisonResult > 0;
  }
  if (comparisonOperator === '>=') {
    return semverComparisonResult >= 0;
  }
  return semverComparisonResult === 0;
}

/**
 * Checks whether a release year matches a year range expression (e.g. '<2024', '<=2023', '>=2020').
 */
function matchesYearRange(releaseYear, yearRangeExpression) {
  if (!releaseYear || !yearRangeExpression) {
    return false;
  }
  const rangeMatchResult = String(yearRangeExpression).trim().match(/^([<>]=?|=)?\s*(\d{4})$/);
  if (!rangeMatchResult) {
    return false;
  }
  const comparisonOperator = rangeMatchResult[1] || '<';
  const targetYear = parseInt(rangeMatchResult[2], 10);

  if (comparisonOperator === '<') {
    return releaseYear < targetYear;
  }
  if (comparisonOperator === '<=') {
    return releaseYear <= targetYear;
  }
  if (comparisonOperator === '>') {
    return releaseYear > targetYear;
  }
  if (comparisonOperator === '>=') {
    return releaseYear >= targetYear;
  }
  return releaseYear === targetYear;
}

/**
 * Finds the matching archive group definition for a given release item.
 */
function findMatchingArchiveGroup(releaseItem, archiveGroupsList) {
  if (!archiveGroupsList || !Array.isArray(archiveGroupsList) || archiveGroupsList.length === 0) {
    return null;
  }

  const { year: parsedYearString } = parseDate(releaseItem.date);
  const releaseYear = parsedYearString ? parseInt(parsedYearString, 10) : (releaseItem.date ? parseInt(String(releaseItem.date).slice(0, 4), 10) : null);

  for (let groupIndex = 0; groupIndex < archiveGroupsList.length; groupIndex += 1) {
    const archiveGroupDefinition = archiveGroupsList[groupIndex];
    const appliesToCriteria = archiveGroupDefinition?.applies_to;

    if (!appliesToCriteria) {
      if (releaseItem.summary) {
        return archiveGroupDefinition;
      }
      continue;
    }

    const isKindMatching = !appliesToCriteria.kind || String(appliesToCriteria.kind).toLowerCase() === String(releaseItem.kind || '').toLowerCase();
    const isVersionMatching = !appliesToCriteria.version_range || matchesVersionRange(releaseItem.version, appliesToCriteria.version_range);

    let isYearMatching = true;
    if (appliesToCriteria.before_year) {
      isYearMatching = Boolean(releaseYear && releaseYear < parseInt(appliesToCriteria.before_year, 10));
    } else if (appliesToCriteria.year_range) {
      isYearMatching = matchesYearRange(releaseYear, appliesToCriteria.year_range);
    } else if (appliesToCriteria.year) {
      isYearMatching = Boolean(releaseYear && releaseYear === parseInt(appliesToCriteria.year, 10));
    }

    if (isKindMatching && isVersionMatching && isYearMatching) {
      return archiveGroupDefinition;
    }
  }

  // If the release has a pre-v4 summary without change rows, assign to the first archive group
  const hasChangeRows = Array.isArray(releaseItem.changes) && releaseItem.changes.length > 0;
  if (!hasChangeRows && releaseItem.summary && archiveGroupsList.length > 0) {
    return archiveGroupsList[0];
  }

  return null;
}

/**
 * Decorates the changelog block
 * @param {Element} block The changelog block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'changelog');
  block.innerHTML = '<div class="changelog-loading"><div class="changelog-spinner" aria-label="Loading changelog"></div></div>';

  const rawChangelog = await fetchChangelog().catch(() => null);
  const parsedChangelog = parseChangelogPayload(rawChangelog);
  const parsedReleasesDocument = parsedChangelog?.parsedReleasesDocument;
  const parsedReleasesMetadata = parsedChangelog?.parsedReleasesMetadata;

  if (!parsedReleasesDocument) {
    block.innerHTML = '<div class="changelog-empty-state"><p class="spectrum-Body spectrum-Body--sizeL changelog-empty-title">Unable to load changelog data. Please check back later.</p></div>';
    return;
  }

  const modulesMap = parsedReleasesDocument?.modules || {};
  const releaseKindsMap = parsedReleasesMetadata?.kinds || {};
  const archiveConfiguration = parsedReleasesMetadata?.archive || null;
  let configuredArchiveGroups = Array.isArray(archiveConfiguration?.groups) ? [...archiveConfiguration.groups] : [];

  // If no explicit groups are configured, synthesize a default group from before_year or cutoff_year
  if (configuredArchiveGroups.length === 0 && (archiveConfiguration?.before_year || archiveConfiguration?.cutoff_year)) {
    const cutoffYear = archiveConfiguration.before_year || archiveConfiguration.cutoff_year;
    configuredArchiveGroups = [
      {
        id: `pre-${cutoffYear}`,
        label: archiveConfiguration.group_label || `${parseInt(cutoffYear, 10) - 1} and earlier`,
        applies_to: { before_year: cutoffYear },
        hint: archiveConfiguration.hint || `Releases before ${cutoffYear} aren't tagged by module or type.`,
      },
    ];
  }

  const isArchiveEnabled = Boolean(archiveConfiguration?.enabled !== false && configuredArchiveGroups.length > 0);
  const archiveSectionLabel = archiveConfiguration?.label || 'Older releases';
  const archiveSectionDescription = archiveConfiguration?.description || '';

  const archiveGroupReleasesMap = new Map();
  configuredArchiveGroups.forEach((groupDefinition) => {
    archiveGroupReleasesMap.set(groupDefinition.id, {
      groupDefinition,
      releasesList: [],
    });
  });

  let totalArchivedReleasesCount = 0;
  const rawReleasesList = Array.isArray(parsedReleasesDocument?.releases) ? parsedReleasesDocument.releases : [];
  const defaultReleaseKind = parsedReleasesMetadata?.defaultKind || '';

  const authoredTitle = block.querySelector('h1, h2, h3')?.textContent?.trim();
  const authoredDescription = block.querySelector('p')?.textContent?.trim();
  const authoredLinks = Array.from(block.querySelectorAll('a')).filter((anchorElement) => {
    const hrefAttribute = anchorElement.getAttribute('href') || '';
    return hrefAttribute && !hrefAttribute.endsWith('.xml') && !hrefAttribute.includes('feed.xml');
  });

  const authoredFeedLink = block.querySelector('a[href$=".xml"], a[href*="feed.xml"]')?.getAttribute('href');
  const feedUrl = authoredFeedLink || parsedReleasesMetadata?.page?.url || '/feed.xml';

  block.innerHTML = '';

  const releases = [];
  const authoredTypeLabels = new Map();

  rawReleasesList.forEach((releaseItem) => {
    const { year, monthName, displayDate, rawDate } = parseDate(releaseItem.date);
    const matchingArchiveGroup = isArchiveEnabled
      ? findMatchingArchiveGroup(releaseItem, configuredArchiveGroups)
      : null;

    if (matchingArchiveGroup && archiveGroupReleasesMap.has(matchingArchiveGroup.id)) {
      archiveGroupReleasesMap.get(matchingArchiveGroup.id).releasesList.push({
        version: releaseItem.version ? `v${String(releaseItem.version).replace(/^v/i, '')}` : (releaseItem.version || ''),
        date: displayDate || releaseItem.date || '',
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

  const configuredTypesMap = { ...(parsedReleasesMetadata?.types || {}) };
  const configuredFilters = parsedReleasesMetadata
    ? (Array.isArray(parsedReleasesMetadata.filters) ? parsedReleasesMetadata.filters : [])
    : null;
  const typeFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'type');
  if (Array.isArray(typeFilterMetadata?.options)) {
    typeFilterMetadata.options.forEach((optionItem) => {
      if (typeof optionItem === 'object' && optionItem) {
        const optionKey = normalizeTypeKey(optionItem.id || optionItem.key || optionItem.value);
        if (optionKey && !configuredTypesMap[optionKey]) {
          configuredTypesMap[optionKey] = {
            label: optionItem.label,
            icon: optionItem.icon,
            color: optionItem.color,
          };
        }
      }
    });
  }
  const defaultTypesByKey = new Map(ALL_TYPES.map((typeItem) => [typeItem.key, typeItem]));

  const availableTypes = [];
  const addedTypeKeys = new Set();

  if (Array.isArray(typeFilterMetadata?.options)) {
    typeFilterMetadata.options.forEach((optionItem) => {
      const rawOptionId = typeof optionItem === 'object'
        ? (optionItem?.id || optionItem?.key || optionItem?.value || '')
        : String(optionItem || '');
      const typeKey = normalizeTypeKey(rawOptionId);
      if (!typeKey || addedTypeKeys.has(typeKey)) {
        return;
      }

      const defaultType = defaultTypesByKey.get(typeKey);
      const configuredType = configuredTypesMap[typeKey];
      const optionLabel = typeof optionItem === 'object' ? optionItem?.label : '';
      const optionIcon = typeof optionItem === 'object' ? optionItem?.icon : '';
      const optionColor = typeof optionItem === 'object' ? optionItem?.color : '';

      availableTypes.push({
        key: typeKey,
        label: optionLabel || configuredType?.label || defaultType?.label || formatTypeLabel(typeKey, rawOptionId),
        icon: optionIcon || configuredType?.icon || defaultType?.icon || typeKey,
        color: optionColor || configuredType?.color || defaultType?.color || 'blue',
      });
      addedTypeKeys.add(typeKey);
    });
  } else {
    const hasAnyStandardType = ALL_TYPES.some((typeItem) => authoredTypeLabels.has(typeItem.key));
    ALL_TYPES.forEach((typeItem) => {
      if (!hasAnyStandardType || authoredTypeLabels.has(typeItem.key)) {
        const configuredType = configuredTypesMap[typeItem.key];
        availableTypes.push({
          ...typeItem,
          label: configuredType?.label || typeItem.label,
          icon: configuredType?.icon || typeItem.icon,
          color: configuredType?.color || typeItem.color,
        });
        addedTypeKeys.add(typeItem.key);
      }
    });
  }

  // Filter definitions and control types (select vs pills)
  const isFilterExplicitlyDisabled = (filterId) => {
    if (!configuredFilters) {
      return false;
    }
    const filterDef = configuredFilters.find((filterItem) => filterItem.id === filterId);
    return Boolean(filterDef && filterDef.enabled === false);
  };

  const moduleFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'module');
  const yearFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'year');
  const monthFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'month');

  const showModuleFilter = !isFilterExplicitlyDisabled('module') && (
    Boolean(moduleFilterMetadata)
    || Object.keys(modulesMap).length > 0
    || releases.some((releaseEntry) => releaseEntry.changes.some((changeEntry) => changeEntry.modules.length > 0))
  );

  const showYearFilter = !isFilterExplicitlyDisabled('year') && (
    Boolean(yearFilterMetadata)
    || releases.some((releaseEntry) => Boolean(releaseEntry.year))
  );

  const showMonthFilter = !isFilterExplicitlyDisabled('month') && (
    Boolean(monthFilterMetadata)
    || releases.some((releaseEntry) => Boolean(releaseEntry.monthName))
  );

  const showTypeFilter = !isFilterExplicitlyDisabled('type') && availableTypes.length > 0;

  function resolveControl(filterMetadata, defaultControl = 'select') {
    if (!filterMetadata) return defaultControl;
    const rawControl = String(filterMetadata.control || '').toLowerCase().trim();
    if (filterMetadata.multiple === true || rawControl === 'multiselect' || rawControl === 'multi-select') {
      return 'multiselect';
    }
    if (rawControl === 'pills') {
      return 'pills';
    }
    if (rawControl === 'select' || rawControl === 'dropdown' || rawControl === 'single-select') {
      return 'select';
    }
    return defaultControl;
  }

  const moduleControl = resolveControl(moduleFilterMetadata, 'multiselect');
  const yearControl = resolveControl(yearFilterMetadata, 'select');
  const monthControl = resolveControl(monthFilterMetadata, 'select');
  const typeControl = resolveControl(typeFilterMetadata, 'pills');

  let moduleOptions = [];
  if (showModuleFilter) {
    if (moduleFilterMetadata?.options && Array.isArray(moduleFilterMetadata.options)) {
      moduleOptions = moduleFilterMetadata.options.map((optionItem) => ({
        value: typeof optionItem === 'object' ? (optionItem.id || optionItem.value || optionItem.key) : String(optionItem),
        text: typeof optionItem === 'object' ? (optionItem.label || modulesMap[optionItem.id] || optionItem.id) : (modulesMap[optionItem] || optionItem),
      }));
    } else if (Object.keys(modulesMap).length > 0) {
      moduleOptions = Object.entries(modulesMap).map(([moduleId, moduleLabel]) => ({
        value: moduleId,
        text: moduleLabel,
      }));
    } else {
      const uniqueModuleIds = Array.from(new Set(releases.flatMap((releaseEntry) => releaseEntry.changes.flatMap((changeEntry) => changeEntry.modules)))).filter(Boolean);
      moduleOptions = uniqueModuleIds.map((moduleId) => ({ value: moduleId, text: moduleId }));
    }
  }

  let yearOptions = [];
  if (showYearFilter) {
    if (yearFilterMetadata?.options && Array.isArray(yearFilterMetadata.options)) {
      yearOptions = yearFilterMetadata.options.map(String);
    } else {
      let archiveMinYear = null;
      configuredArchiveGroups.forEach((groupDefinition) => {
        const applies = groupDefinition?.applies_to;
        if (applies?.before_year) {
          const parsedBeforeYear = parseInt(applies.before_year, 10);
          if (!isNaN(parsedBeforeYear)) {
            archiveMinYear = archiveMinYear === null ? parsedBeforeYear : Math.max(archiveMinYear, parsedBeforeYear);
          }
        }
      });

      const activeReleaseYears = releases
        .map((releaseEntry) => parseInt(releaseEntry.year, 10))
        .filter((numericYear) => !isNaN(numericYear));

      const currentYear = new Date().getFullYear();
      const minActiveYear = activeReleaseYears.length > 0 ? Math.min(...activeReleaseYears) : currentYear;
      const leastYear = archiveMinYear !== null ? archiveMinYear : minActiveYear;
      const maxYear = Math.max(currentYear, ...(activeReleaseYears.length ? activeReleaseYears : [currentYear]));

      const generatedYears = [];
      for (let y = maxYear; y >= leastYear; y -= 1) {
        generatedYears.push(String(y));
      }
      yearOptions = generatedYears;
    }
  }

  const latestRelease = releases[0] || null;
  const filterState = {
    modules: new Set(),
    year: 'all',
    month: 'all',
    types: new Set(),
  };

  Object.defineProperty(filterState, 'module', {
    get() {
      if (this.modules.size === 0) return 'all';
      if (this.modules.size === 1) return Array.from(this.modules)[0];
      return Array.from(this.modules).join(',');
    },
    set(val) {
      this.modules.clear();
      if (val && val !== 'all') {
        String(val).split(',').map((s) => s.trim()).filter(Boolean).forEach((m) => this.modules.add(m));
      }
    },
  });

  function readFromUrl() {
    const searchParameters = new URLSearchParams(window.location.search);
    const moduleQueryParameter = searchParameters.get('module') || searchParameters.get('modules');
    const yearQueryParameter = searchParameters.get('year');
    const monthQueryParameter = searchParameters.get('month');
    const typesQueryParameter = searchParameters.get('types') || searchParameters.get('type');

    if (showModuleFilter && moduleQueryParameter) {
      filterState.modules.clear();
      if (moduleQueryParameter !== 'all') {
        moduleQueryParameter.split(',').forEach((modId) => {
          const trimmed = modId.trim();
          if (trimmed && (moduleOptions.some((optionItem) => optionItem.value === trimmed) || trimmed === 'all')) {
            if (trimmed !== 'all') {
              filterState.modules.add(trimmed);
            }
          }
        });
      }
    }
    if (showYearFilter && yearQueryParameter && (yearQueryParameter === 'all' || yearOptions.includes(yearQueryParameter))) {
      filterState.year = yearQueryParameter;
    }
    if (showMonthFilter && monthQueryParameter) {
      filterState.month = monthQueryParameter;
    }
    if (typesQueryParameter) {
      filterState.types.clear();
      typesQueryParameter.split(',').forEach((typeKey) => {
        const normalizedParamKey = normalizeTypeKey(typeKey);
        const matchedType = availableTypes.find((typeItem) => typeItem.key === normalizedParamKey);
        if (matchedType) {
          filterState.types.add(matchedType.key);
        }
      });
    }
  }

  function writeToUrl() {
    const searchParameters = new URLSearchParams(window.location.search);
    if (filterState.modules.size > 0) {
      searchParameters.set('module', Array.from(filterState.modules).join(','));
    } else {
      searchParameters.delete('module');
      searchParameters.delete('modules');
    }

    if (filterState.year && filterState.year !== 'all') {
      searchParameters.set('year', filterState.year);
    } else {
      searchParameters.delete('year');
    }

    if (filterState.month && filterState.month !== 'all') {
      searchParameters.set('month', filterState.month);
    } else {
      searchParameters.delete('month');
    }

    if (filterState.types.size > 0) {
      searchParameters.set('types', Array.from(filterState.types).join(','));
    } else {
      searchParameters.delete('types');
      searchParameters.delete('type');
    }

    const queryString = searchParameters.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`);
  }

  readFromUrl();

  const container = createTag('div', { class: 'changelog-container' });

  // 1. Header Section
  const headerSection = createTag('header', { class: 'changelog-header' });
  const titleHeading = createTag('h1', { class: 'spectrum-Heading spectrum-Heading--sizeXL spectrum-Heading--light changelog-title' });
  titleHeading.textContent = authoredTitle || parsedReleasesMetadata?.page?.title || 'Changelog';

  const descriptionText = authoredDescription || parsedReleasesMetadata?.page?.description || '';
  let descriptionParagraph = null;
  if (descriptionText) {
    descriptionParagraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXL changelog-description' });
    descriptionParagraph.textContent = descriptionText;
  }

  const quickLinksContainer = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeXL changelog-quick-links' });
  authoredLinks.forEach((authoredLinkElement) => {
    const linkElement = createTag('a', {
      class: 'spectrum-Link changelog-quick-link',
      href: authoredLinkElement.href,
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    linkElement.textContent = authoredLinkElement.textContent.trim() || authoredLinkElement.href;
    quickLinksContainer.append(linkElement);
  });

  const rssLinkElement = createTag('a', {
    class: 'spectrum-Link changelog-quick-link changelog-rss-link',
    href: feedUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': 'Subscribe to RSS feed',
  });
  rssLinkElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><circle cx="6.18" cy="17.82" r="2.18" fill="#eb1000"></circle><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" fill="#eb1000"></path></svg> <span>Subscribe to RSS feed</span>`;
  quickLinksContainer.append(rssLinkElement);

  const subHeaderContainer = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-sub-header' });
  const latestInfoSpan = createTag('span', { class: 'changelog-latest-info' });
  if (latestRelease && (latestRelease.version || latestRelease.title || latestRelease.date)) {
    const latestReleaseParts = [
      latestRelease.version ? `<strong>${latestRelease.version}</strong>` : (latestRelease.title ? `<strong>${latestRelease.title}</strong>` : ''),
      latestRelease.date,
    ].filter(Boolean);
    latestInfoSpan.innerHTML = `Latest: ${latestReleaseParts.join(' · ')}`;
    subHeaderContainer.append(latestInfoSpan);
  }

  headerSection.append(titleHeading);
  if (descriptionParagraph) {
    headerSection.append(descriptionParagraph);
  }
  headerSection.append(quickLinksContainer);
  if (subHeaderContainer.children.length > 0) {
    headerSection.append(subHeaderContainer);
  }

  const CALENDAR_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function getMonthOptionsForYear(selectedYear) {
    const allMonthsLabel = monthFilterMetadata?.allLabel || 'All months';

    if (selectedYear !== 'all' && monthFilterMetadata?.optionsByYear?.[selectedYear]) {
      const customMonths = monthFilterMetadata.optionsByYear[selectedYear];
      return [
        { value: 'all', text: allMonthsLabel },
        ...customMonths.map((monthName) => ({ value: monthName, text: monthName })),
      ];
    }

    if (Array.isArray(monthFilterMetadata?.options) && monthFilterMetadata.options.length > 0) {
      return [
        { value: 'all', text: allMonthsLabel },
        ...monthFilterMetadata.options.map((optionItem) => ({
          value: typeof optionItem === 'object' ? (optionItem.id || optionItem.value || optionItem.label) : String(optionItem),
          text: typeof optionItem === 'object' ? (optionItem.label || optionItem.id) : String(optionItem),
        })),
      ];
    }

    const targetReleases = selectedYear === 'all'
      ? releases
      : releases.filter((releaseEntry) => releaseEntry.year === selectedYear);

    const availableMonthsSet = new Set(targetReleases.map((releaseEntry) => releaseEntry.monthName).filter(Boolean));
    const availableMonths = CALENDAR_MONTHS.filter((monthName) => availableMonthsSet.has(monthName));

    return [
      { value: 'all', text: allMonthsLabel },
      ...availableMonths.map((monthName) => ({ value: monthName, text: monthName })),
    ];
  }

  // 2. Filter Card
  const filterCard = createTag('section', { id: 'filters', class: 'changelog-filter-card', 'aria-label': 'Changelog filters' });
  const dropdownRow = createTag('div', { class: 'changelog-filter-row-dropdowns' });
  const pillRows = [];

  function createSingleSelectDropdown({
    id,
    labelText,
    options,
    currentValue,
    onChange,
  }) {
    const groupContainer = createTag('div', { class: 'changelog-filter-group' });
    const labelElement = createTag('label', {
      class: 'spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label',
      for: id,
    });
    labelElement.textContent = labelText;
    const selectElement = createTag('select', {
      id,
      name: id.replace('changelog-filter-', ''),
      'aria-label': `Filter by ${labelText}`,
    });

    function populateOptions(opts, selVal) {
      selectElement.innerHTML = '';
      opts.forEach(({ value, text }) => {
        const optionElement = createTag('option', { value });
        optionElement.textContent = text;
        if (String(value).toLowerCase() === String(selVal).toLowerCase()
          || (selVal !== 'all' && text.toLowerCase() === String(selVal).toLowerCase())) {
          optionElement.selected = true;
        }
        selectElement.appendChild(optionElement);
      });
      selectElement.value = selVal;
    }

    populateOptions(options, currentValue);

    selectElement.addEventListener('change', (e) => {
      onChange(e.target.value);
    });

    groupContainer.append(labelElement, selectElement);

    return {
      group: groupContainer,
      select: selectElement,
      setValue(newVal) {
        selectElement.value = newVal;
      },
      updateOptions(newOptions, newVal) {
        populateOptions(newOptions, newVal);
      },
    };
  }

  function createMultiSelectDropdown({
    id,
    labelText,
    allLabel = 'All',
    options,
    selectedSet,
    onChange,
  }) {
    const groupContainer = createTag('div', { class: 'changelog-filter-group changelog-multiselect-group' });
    const labelElement = createTag('label', {
      class: 'spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label',
      id: `${id}-label`,
    });
    labelElement.textContent = labelText;

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
      if (selectedSet.size === 0) {
        triggerText.textContent = allLabel;
        trigger.setAttribute('value', 'all');
      } else if (selectedSet.size === 1) {
        const selectedValue = Array.from(selectedSet)[0];
        const matchedOption = options.find((opt) => opt.value === selectedValue);
        const displayLabel = matchedOption ? matchedOption.text : selectedValue;
        triggerText.textContent = displayLabel;
        trigger.setAttribute('value', selectedValue);
      } else {
        triggerText.textContent = `${selectedSet.size} selected`;
        trigger.setAttribute('value', Array.from(selectedSet).join(','));
      }
    }

    updateTriggerLabel();

    const triggerIcon = createTag('span', { class: 'changelog-multiselect-trigger-icon', 'aria-hidden': 'true' });
    triggerIcon.innerHTML = getIconSvg('chevron');
    trigger.append(triggerText, triggerIcon);

    const popover = createTag('div', {
      class: 'changelog-multiselect-popover',
      role: 'listbox',
      'aria-multiselectable': 'true',
      hidden: true,
    });

    const allOptionLabel = createTag('label', { class: 'changelog-multiselect-option changelog-multiselect-option-all' });
    const allCheckbox = createTag('input', {
      type: 'checkbox',
      class: 'changelog-multiselect-checkbox',
      value: 'all',
    });
    allCheckbox.checked = selectedSet.size === 0;
    const allOptionSpan = createTag('span', { class: 'changelog-multiselect-option-text' });
    allOptionSpan.textContent = allLabel;
    allOptionLabel.append(allCheckbox, allOptionSpan);

    const divider = createTag('div', { class: 'changelog-multiselect-divider', role: 'separator' });
    const listContainer = createTag('div', { class: 'changelog-multiselect-options-list' });
    const optionCheckboxes = [];

    options.forEach((opt) => {
      const optionLabel = createTag('label', { class: 'changelog-multiselect-option' });
      const checkbox = createTag('input', {
        type: 'checkbox',
        class: 'changelog-multiselect-checkbox',
        value: opt.value,
      });
      checkbox.checked = selectedSet.has(opt.value);
      optionCheckboxes.push(checkbox);

      const optionSpan = createTag('span', { class: 'changelog-multiselect-option-text' });
      optionSpan.textContent = opt.text;
      optionLabel.append(checkbox, optionSpan);
      listContainer.append(optionLabel);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedSet.add(opt.value);
          allCheckbox.checked = false;
        } else {
          selectedSet.delete(opt.value);
          if (selectedSet.size === 0) {
            allCheckbox.checked = true;
          }
        }
        updateTriggerLabel();
        onChange(selectedSet);
      });
    });

    allCheckbox.addEventListener('change', () => {
      selectedSet.clear();
      allCheckbox.checked = true;
      optionCheckboxes.forEach((cb) => { cb.checked = false; });
      updateTriggerLabel();
      onChange(selectedSet);
    });

    function setOpen(open) {
      trigger.setAttribute('aria-expanded', String(open));
      popover.hidden = !open;
    }

    trigger.addEventListener('click', (e) => {
      e?.stopPropagation?.();
      const isCurrentlyOpen = trigger.getAttribute('aria-expanded') === 'true';
      setOpen(!isCurrentlyOpen);
    });

    if (typeof document !== 'undefined' && document?.addEventListener) {
      document.addEventListener('click', (e) => {
        if (groupContainer.contains && !groupContainer.contains(e.target)) {
          setOpen(false);
        }
      });
    }

    groupContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.focus?.();
      }
    });

    popover.append(allOptionLabel, divider, listContainer);
    wrapper.append(trigger, popover);
    groupContainer.append(labelElement, wrapper);

    return {
      group: groupContainer,
      trigger,
      popover,
      update(newSelectedSet) {
        if (newSelectedSet) {
          selectedSet = newSelectedSet;
        }
        allCheckbox.checked = selectedSet.size === 0;
        optionCheckboxes.forEach((cb) => {
          cb.checked = selectedSet.has(cb.value);
        });
        updateTriggerLabel();
      },
      close() {
        setOpen(false);
      },
    };
  }

  let moduleMultiSelect = null;
  let moduleSingleSelect = null;
  let modulePillsContainer = null;
  if (showModuleFilter) {
    if (moduleControl === 'pills') {
      const moduleRow = createTag('div', { class: 'changelog-filter-row-types changelog-filter-row-pills changelog-filter-row-module' });
      moduleRow.innerHTML = `<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label">${escapeHtml(moduleFilterMetadata?.label || 'Module')}</div>`;
      modulePillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': `Filter by ${moduleFilterMetadata?.label || 'Module'}` });
      moduleRow.append(modulePillsContainer);
      pillRows.push(moduleRow);
    } else if (moduleControl === 'multiselect') {
      moduleMultiSelect = createMultiSelectDropdown({
        id: 'changelog-filter-module',
        labelText: moduleFilterMetadata?.label || 'Module',
        allLabel: moduleFilterMetadata?.allLabel || 'All modules',
        options: moduleOptions,
        selectedSet: filterState.modules,
        onChange: () => {
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(moduleMultiSelect.group);
    } else {
      moduleSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-module',
        labelText: moduleFilterMetadata?.label || 'Module',
        options: [{ value: 'all', text: moduleFilterMetadata?.allLabel || 'All modules' }, ...moduleOptions],
        currentValue: filterState.module,
        onChange: (val) => {
          filterState.module = val;
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(moduleSingleSelect.group);
    }
  }

  let yearSingleSelect = null;
  let yearPillsContainer = null;
  if (showYearFilter) {
    if (yearControl === 'pills') {
      const yearRow = createTag('div', { class: 'changelog-filter-row-types changelog-filter-row-pills changelog-filter-row-year' });
      yearRow.innerHTML = `<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label">${escapeHtml(yearFilterMetadata?.label || 'Year')}</div>`;
      yearPillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': `Filter by ${yearFilterMetadata?.label || 'Year'}` });
      yearRow.append(yearPillsContainer);
      pillRows.push(yearRow);
    } else {
      yearSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-year',
        labelText: yearFilterMetadata?.label || 'Year',
        options: [{ value: 'all', text: yearFilterMetadata?.allLabel || 'All years' }, ...yearOptions.map((yearOption) => ({ value: yearOption, text: yearOption }))],
        currentValue: filterState.year,
        onChange: (val) => {
          filterState.year = val;
          updateMonthControlOptions();
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(yearSingleSelect.group);
    }
  }

  let monthSingleSelect = null;
  let monthPillsContainer = null;
  if (showMonthFilter) {
    if (monthControl === 'pills') {
      const monthRow = createTag('div', { class: 'changelog-filter-row-types changelog-filter-row-pills changelog-filter-row-month' });
      monthRow.innerHTML = `<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label">${escapeHtml(monthFilterMetadata?.label || 'Month')}</div>`;
      monthPillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': `Filter by ${monthFilterMetadata?.label || 'Month'}` });
      monthRow.append(monthPillsContainer);
      pillRows.push(monthRow);
    } else {
      monthSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-month',
        labelText: monthFilterMetadata?.label || 'Month',
        options: getMonthOptionsForYear(filterState.year),
        currentValue: filterState.month,
        onChange: (val) => {
          filterState.month = val;
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(monthSingleSelect.group);
    }
  }

  let typeSingleSelect = null;
  let typeMultiSelect = null;
  let typePillsContainer = null;
  if (showTypeFilter) {
    if (typeControl === 'select') {
      const typeSelectOptions = [
        { value: 'all', text: typeFilterMetadata?.allLabel || 'All types' },
        ...availableTypes.map((typeItem) => ({ value: typeItem.key, text: typeItem.label })),
      ];
      typeSingleSelect = createSingleSelectDropdown({
        id: 'changelog-filter-type',
        labelText: typeFilterMetadata?.label || 'Type of change',
        options: typeSelectOptions,
        currentValue: filterState.types.size === 1 ? Array.from(filterState.types)[0] : 'all',
        onChange: (val) => {
          filterState.types.clear();
          if (val !== 'all') {
            filterState.types.add(val);
          }
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(typeSingleSelect.group);
    } else if (typeControl === 'multiselect') {
      typeMultiSelect = createMultiSelectDropdown({
        id: 'changelog-filter-type',
        labelText: typeFilterMetadata?.label || 'Type of change',
        allLabel: typeFilterMetadata?.allLabel || 'All types',
        options: availableTypes.map((typeItem) => ({ value: typeItem.key, text: typeItem.label })),
        selectedSet: filterState.types,
        onChange: () => {
          writeToUrl();
          applyFilters();
        },
      });
      dropdownRow.append(typeMultiSelect.group);
    } else {
      const typeRow = createTag('div', { class: 'changelog-filter-row-types changelog-filter-row-pills changelog-filter-row-type' });
      typeRow.innerHTML = `<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label">${escapeHtml(typeFilterMetadata?.label || 'Type of change')}</div>`;
      typePillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': 'Filter by change type' });
      typeRow.append(typePillsContainer);
      pillRows.push(typeRow);
    }
  }

  const summaryRow = createTag('div', { class: 'changelog-filter-summary-row' });
  const summaryText = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-filter-summary-text', 'aria-live': 'polite' });
  summaryRow.append(summaryText);

  if (dropdownRow.children.length > 0) {
    filterCard.append(dropdownRow);
  }
  pillRows.forEach((pillRow) => filterCard.append(pillRow));
  filterCard.append(summaryRow);

  const resultsContainer = createTag('div', { class: 'changelog-results' });

  // 3. Dynamic Archive / Older releases section
  const archiveSection = createTag('section', {
    class: 'changelog-archive-section changelog-older-section',
    'aria-label': archiveSectionLabel,
  });

  if (isArchiveEnabled && totalArchivedReleasesCount > 0) {
    const archiveHeadingTarget = createTag('div', { class: 'heading2 changelog-toc-target' });
    const archiveHeading = createTag('h2', {
      id: 'archive-releases-heading',
      class: 'spectrum-Heading spectrum-Heading--sizeM changelog-year-heading',
    });
    archiveHeading.textContent = archiveSectionLabel;
    archiveHeadingTarget.append(archiveHeading);
    archiveSection.append(archiveHeadingTarget);

    if (archiveSectionDescription) {
      const archiveDescriptionParagraph = createTag('p', {
        class: 'spectrum-Body spectrum-Body--sizeM changelog-archive-description',
      });
      archiveDescriptionParagraph.textContent = archiveSectionDescription;
      archiveSection.append(archiveDescriptionParagraph);
    }

    configuredArchiveGroups.forEach((groupDefinition) => {
      const groupData = archiveGroupReleasesMap.get(groupDefinition.id);
      if (!groupData || groupData.releasesList.length === 0) {
        return;
      }

      const groupAccordion = createTag('div', {
        class: 'changelog-accordion changelog-archive-group',
        id: `archive-group-${groupDefinition.id}`,
      });

      const accordionContentId = `changelog-archive-content-${groupDefinition.id}`;
      const groupReleasesCount = groupData.releasesList.length;
      const groupCountLabel = `${groupReleasesCount} release${groupReleasesCount === 1 ? '' : 's'}`;

      groupAccordion.innerHTML = `
        <button class="spectrum-Heading spectrum-Heading--sizeXS changelog-accordion-trigger" type="button" aria-expanded="false" aria-controls="${accordionContentId}">
          <span class="changelog-accordion-left">
            <span class="changelog-accordion-title">${groupDefinition.label}</span>
            <span class="spectrum-Body spectrum-Body--sizeS changelog-accordion-count">${groupCountLabel}</span>
          </span>
          <span class="changelog-accordion-arrow">${getIconSvg('chevron')}</span>
        </button>
        <div class="changelog-accordion-content" id="${accordionContentId}" hidden>
          ${groupDefinition.hint ? `<p class="spectrum-Body spectrum-Body--sizeS changelog-archive-hint">${groupDefinition.hint}</p>` : ''}
          <div class="changelog-archive-list">
            ${groupData.releasesList.map((releaseItem) => `
              <div class="changelog-archive-item">
                <div class="changelog-archive-meta">
                  <span class="spectrum-Heading spectrum-Heading--sizeXS changelog-archive-version">${releaseItem.version || releaseItem.title || ''}</span>${releaseItem.date ? ` · <span class="spectrum-Body spectrum-Body--sizeS changelog-archive-date">${releaseItem.date}</span>` : ''}
                  ${releaseItem.breaking ? '<span class="changelog-badge changelog-badge-breaking">Breaking</span>' : ''}
                </div>
                <div class="spectrum-Body spectrum-Body--sizeS changelog-archive-desc">${renderMarkdown(releaseItem.summary || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      const accordionTrigger = groupAccordion.querySelector('.changelog-accordion-trigger');
      const accordionContent = groupAccordion.querySelector('.changelog-accordion-content');
      accordionTrigger.addEventListener('click', () => {
        const isCurrentlyExpanded = accordionTrigger.getAttribute('aria-expanded') === 'true';
        accordionTrigger.setAttribute('aria-expanded', String(!isCurrentlyExpanded));
        accordionContent.hidden = isCurrentlyExpanded;
      });

      archiveSection.append(groupAccordion);
    });
  }

  function updateMonthControlOptions() {
    const updatedMonthOptions = getMonthOptionsForYear(filterState.year);
    const validMonthValues = new Set(updatedMonthOptions.map((optionItem) => String(optionItem.value).toLowerCase()));

    if (filterState.month !== 'all' && !validMonthValues.has(String(filterState.month).toLowerCase())) {
      filterState.month = 'all';
    }

    if (monthSingleSelect) {
      monthSingleSelect.updateOptions(updatedMonthOptions, filterState.month);
    }
  }

  function matchesMonth(releaseItem) {
    return filterState.month === 'all'
      || releaseItem.monthName.toLowerCase() === String(filterState.month).toLowerCase();
  }

  // Filtering & Rendering logic
  function getFilteredData() {
    let totalMatchingChanges = 0;
    const matchingReleases = [];

    releases.forEach((releaseItem) => {
      if (filterState.year !== 'all' && releaseItem.year !== filterState.year) {
        return;
      }
      if (!matchesMonth(releaseItem)) {
        return;
      }

      if (releaseItem.changes.length === 0) {
        if (filterState.modules.size === 0 && filterState.types.size === 0) {
          matchingReleases.push(releaseItem);
        }
        return;
      }

      const matchingChanges = releaseItem.changes.filter((changeItem) => {
        if (filterState.modules.size > 0 && !(changeItem.modules || []).some((m) => filterState.modules.has(m))) {
          return false;
        }
        if (filterState.types.size > 0 && !changeItem.types.some((typeKey) => filterState.types.has(typeKey))) {
          return false;
        }
        return true;
      });

      if (matchingChanges.length > 0) {
        totalMatchingChanges += matchingChanges.length;
        matchingReleases.push({ ...releaseItem, changes: matchingChanges });
      }
    });

    return { matchingReleases, totalMatchingChanges };
  }

  function renderPills() {
    if (typePillsContainer) {
      typePillsContainer.innerHTML = '';
      const changeTypeCounts = { all: 0 };
      availableTypes.forEach((typeDefinition) => { changeTypeCounts[typeDefinition.key] = 0; });

      releases.forEach((releaseItem) => {
        if (filterState.year !== 'all' && releaseItem.year !== filterState.year) {
          return;
        }
        if (!matchesMonth(releaseItem)) {
          return;
        }

        releaseItem.changes.forEach((changeItem) => {
          if (filterState.modules.size > 0 && !(changeItem.modules || []).some((m) => filterState.modules.has(m))) {
            return;
          }
          changeTypeCounts.all += 1;
          changeItem.types.forEach((typeKey) => {
            if (changeTypeCounts[typeKey] !== undefined) {
              changeTypeCounts[typeKey] += 1;
            }
          });
        });
      });

      const isAllTypesSelected = filterState.types.size === 0;
      const allTypesLabel = typeFilterMetadata?.allLabel || 'All types';
      const allPill = createTag('button', {
        type: 'button',
        class: `changelog-pill ${isAllTypesSelected ? 'is-selected' : ''}`,
        'aria-pressed': String(isAllTypesSelected),
      });
      allPill.innerHTML = `<span>${escapeHtml(allTypesLabel)}</span> <span class="changelog-pill-count">${changeTypeCounts.all}</span>`;
      allPill.addEventListener('click', () => {
        filterState.types.clear();
        if (typeSingleSelect) {
          typeSingleSelect.setValue('all');
        }
        if (typeMultiSelect) {
          typeMultiSelect.update(filterState.types);
        }
        writeToUrl();
        applyFilters();
      });
      typePillsContainer.appendChild(allPill);

      availableTypes.forEach((typeDefinition) => {
        const isSelected = filterState.types.has(typeDefinition.key);
        const colorHex = resolveColorHex(typeDefinition.color, '#0265DC');
        const typePill = createTag('button', {
          type: 'button',
          class: `changelog-pill type-pill-${typeDefinition.key} ${isSelected ? 'is-selected' : ''}`,
          'aria-pressed': String(isSelected),
          'data-type': typeDefinition.key,
        });
        typePill.innerHTML = `${getIconSvg(typeDefinition.icon, colorHex)} <span>${escapeHtml(typeDefinition.label)}</span> <span class="changelog-pill-count">${changeTypeCounts[typeDefinition.key]}</span>`;
        typePill.addEventListener('click', () => {
          if (filterState.types.has(typeDefinition.key)) {
            filterState.types.delete(typeDefinition.key);
          } else {
            filterState.types.add(typeDefinition.key);
          }
          if (typeSingleSelect) {
            typeSingleSelect.setValue(filterState.types.size === 1 ? Array.from(filterState.types)[0] : 'all');
          }
          if (typeMultiSelect) {
            typeMultiSelect.update(filterState.types);
          }
          writeToUrl();
          applyFilters();
        });
        typePillsContainer.appendChild(typePill);
      });
    }

    if (modulePillsContainer) {
      modulePillsContainer.innerHTML = '';
      const moduleCounts = { all: 0 };
      moduleOptions.forEach((optionItem) => { moduleCounts[optionItem.value] = 0; });

      releases.forEach((releaseItem) => {
        if (filterState.year !== 'all' && releaseItem.year !== filterState.year) {
          return;
        }
        if (!matchesMonth(releaseItem)) {
          return;
        }

        releaseItem.changes.forEach((changeItem) => {
          if (filterState.types.size > 0 && !changeItem.types.some((typeKey) => filterState.types.has(typeKey))) {
            return;
          }
          moduleCounts.all += 1;
          (changeItem.modules || []).forEach((moduleId) => {
            if (moduleCounts[moduleId] !== undefined) {
              moduleCounts[moduleId] += 1;
            }
          });
        });
      });

      const isAllModulesSelected = filterState.modules.size === 0;
      const allModulesLabel = moduleFilterMetadata?.allLabel || 'All modules';
      const allModulePill = createTag('button', {
        type: 'button',
        class: `changelog-pill ${isAllModulesSelected ? 'is-selected' : ''}`,
        'aria-pressed': String(isAllModulesSelected),
      });
      allModulePill.innerHTML = `<span>${escapeHtml(allModulesLabel)}</span> <span class="changelog-pill-count">${moduleCounts.all}</span>`;
      allModulePill.addEventListener('click', () => {
        filterState.modules.clear();
        if (moduleSingleSelect) {
          moduleSingleSelect.setValue('all');
        }
        if (moduleMultiSelect) {
          moduleMultiSelect.update(filterState.modules);
        }
        writeToUrl();
        applyFilters();
      });
      modulePillsContainer.appendChild(allModulePill);

      moduleOptions.forEach((optionItem) => {
        const isSelected = filterState.modules.has(optionItem.value);
        const modPill = createTag('button', {
          type: 'button',
          class: `changelog-pill ${isSelected ? 'is-selected' : ''}`,
          'aria-pressed': String(isSelected),
        });
        modPill.innerHTML = `<span>${escapeHtml(optionItem.text)}</span> <span class="changelog-pill-count">${moduleCounts[optionItem.value] || 0}</span>`;
        modPill.addEventListener('click', () => {
          if (filterState.modules.has(optionItem.value)) {
            filterState.modules.delete(optionItem.value);
          } else {
            filterState.modules.add(optionItem.value);
          }
          if (moduleSingleSelect) {
            moduleSingleSelect.setValue(filterState.module);
          }
          if (moduleMultiSelect) {
            moduleMultiSelect.update(filterState.modules);
          }
          writeToUrl();
          applyFilters();
        });
        modulePillsContainer.appendChild(modPill);
      });
    }

    if (yearPillsContainer) {
      yearPillsContainer.innerHTML = '';
      const yearCounts = { all: 0 };
      yearOptions.forEach((yearValue) => { yearCounts[yearValue] = 0; });

      releases.forEach((releaseItem) => {
        if (!matchesMonth(releaseItem)) {
          return;
        }
        const hasMatchingContent = releaseItem.changes.some((changeItem) => {
          if (filterState.modules.size > 0 && !(changeItem.modules || []).some((m) => filterState.modules.has(m))) {
            return false;
          }
          if (filterState.types.size > 0 && !changeItem.types.some((typeKey) => filterState.types.has(typeKey))) {
            return false;
          }
          return true;
        }) || (releaseItem.changes.length === 0 && filterState.modules.size === 0 && filterState.types.size === 0);

        if (hasMatchingContent) {
          yearCounts.all += 1;
          if (yearCounts[releaseItem.year] !== undefined) {
            yearCounts[releaseItem.year] += 1;
          }
        }
      });

      const isAllYearsSelected = filterState.year === 'all';
      const allYearsLabel = yearFilterMetadata?.allLabel || 'All years';
      const allYearPill = createTag('button', {
        type: 'button',
        class: `changelog-pill ${isAllYearsSelected ? 'is-selected' : ''}`,
        'aria-pressed': String(isAllYearsSelected),
      });
      allYearPill.innerHTML = `<span>${escapeHtml(allYearsLabel)}</span> <span class="changelog-pill-count">${yearCounts.all}</span>`;
      allYearPill.addEventListener('click', () => {
        filterState.year = 'all';
        if (yearSingleSelect) {
          yearSingleSelect.setValue('all');
        }
        updateMonthControlOptions();
        writeToUrl();
        applyFilters();
      });
      yearPillsContainer.appendChild(allYearPill);

      yearOptions.forEach((yearValue) => {
        const isSelected = filterState.year === yearValue;
        const yearPill = createTag('button', {
          type: 'button',
          class: `changelog-pill ${isSelected ? 'is-selected' : ''}`,
          'aria-pressed': String(isSelected),
        });
        yearPill.innerHTML = `<span>${escapeHtml(yearValue)}</span> <span class="changelog-pill-count">${yearCounts[yearValue] || 0}</span>`;
        yearPill.addEventListener('click', () => {
          filterState.year = filterState.year === yearValue ? 'all' : yearValue;
          if (yearSingleSelect) {
            yearSingleSelect.setValue(filterState.year);
          }
          updateMonthControlOptions();
          writeToUrl();
          applyFilters();
        });
        yearPillsContainer.appendChild(yearPill);
      });
    }

    if (monthPillsContainer) {
      monthPillsContainer.innerHTML = '';
      const currentMonthOptions = getMonthOptionsForYear(filterState.year).filter((optionItem) => optionItem.value !== 'all');
      const monthCounts = { all: 0 };
      currentMonthOptions.forEach((optionItem) => { monthCounts[optionItem.value] = 0; });

      releases.forEach((releaseItem) => {
        if (filterState.year !== 'all' && releaseItem.year !== filterState.year) {
          return;
        }
        const hasMatchingContent = releaseItem.changes.some((changeItem) => {
          if (filterState.modules.size > 0 && !(changeItem.modules || []).some((m) => filterState.modules.has(m))) {
            return false;
          }
          if (filterState.types.size > 0 && !changeItem.types.some((typeKey) => filterState.types.has(typeKey))) {
            return false;
          }
          return true;
        }) || (releaseItem.changes.length === 0 && filterState.modules.size === 0 && filterState.types.size === 0);

        if (hasMatchingContent) {
          monthCounts.all += 1;
          if (monthCounts[releaseItem.monthName] !== undefined) {
            monthCounts[releaseItem.monthName] += 1;
          }
        }
      });

      const isAllMonthsSelected = filterState.month === 'all';
      const allMonthsLabel = monthFilterMetadata?.allLabel || 'All months';
      const allMonthPill = createTag('button', {
        type: 'button',
        class: `changelog-pill ${isAllMonthsSelected ? 'is-selected' : ''}`,
        'aria-pressed': String(isAllMonthsSelected),
      });
      allMonthPill.innerHTML = `<span>${escapeHtml(allMonthsLabel)}</span> <span class="changelog-pill-count">${monthCounts.all}</span>`;
      allMonthPill.addEventListener('click', () => {
        filterState.month = 'all';
        if (monthSingleSelect) {
          monthSingleSelect.setValue('all');
        }
        writeToUrl();
        applyFilters();
      });
      monthPillsContainer.appendChild(allMonthPill);

      currentMonthOptions.forEach((optionItem) => {
        const isSelected = filterState.month === optionItem.value;
        const monthPill = createTag('button', {
          type: 'button',
          class: `changelog-pill ${isSelected ? 'is-selected' : ''}`,
          'aria-pressed': String(isSelected),
        });
        monthPill.innerHTML = `<span>${escapeHtml(optionItem.text)}</span> <span class="changelog-pill-count">${monthCounts[optionItem.value] || 0}</span>`;
        monthPill.addEventListener('click', () => {
          filterState.month = filterState.month === optionItem.value ? 'all' : optionItem.value;
          if (monthSingleSelect) {
            monthSingleSelect.setValue(filterState.month);
          }
          writeToUrl();
          applyFilters();
        });
        monthPillsContainer.appendChild(monthPill);
      });
    }
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

    const releasesByYear = new Map();
    matchingReleases.forEach((releaseItem) => {
      if (!releasesByYear.has(releaseItem.year)) {
        releasesByYear.set(releaseItem.year, []);
      }
      releasesByYear.get(releaseItem.year).push(releaseItem);
    });

    releasesByYear.forEach((releasesInYear, year) => {
      const sectionAttributes = { class: 'changelog-year-section' };
      if (year) {
        sectionAttributes['aria-labelledby'] = year;
      }
      const yearSection = createTag('section', sectionAttributes);
      const yearHeadingHtml = year
        ? `<div class="heading2 changelog-toc-target"><h2 id="${year}" class="spectrum-Heading spectrum-Heading--sizeM changelog-year-heading">${year}</h2></div>`
        : '';
      yearSection.innerHTML = yearHeadingHtml;

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
      yearSection.append(releaseList);

      releasesInYear.forEach((releaseItem, releaseIndex) => {
        const cardSlug = String(releaseItem.title || releaseItem.kind || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const cardId = releaseItem.version
          ? releaseItem.version.replace(/\./g, '-')
          : (releaseItem.rawDate ? `docs-${releaseItem.rawDate}` : (cardSlug || `release-${year || 'entry'}-${releaseIndex + 1}`));
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
              const typeDefinition = availableTypes.find((typeItem) => typeItem.key === typeKey);
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
            const moduleLabels = (changeItem.modules || []).map((moduleId) => modulesMap[moduleId] || moduleId).filter(Boolean);
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

        releaseList.appendChild(releaseCard);
      });

      resultsContainer.appendChild(yearSection);
    });
  }

  function updateSummary(totalMatchingChanges, matchingReleasesCount) {
    const isFiltered = filterState.modules.size > 0 || filterState.year !== 'all' || filterState.month !== 'all' || filterState.types.size > 0;
    summaryText.innerHTML = '';
    const archiveSummaryText = isArchiveEnabled && totalArchivedReleasesCount > 0
      ? ` and ${totalArchivedReleasesCount} in ${archiveSectionLabel.toLowerCase()}`
      : '';

    if (!isFiltered) {
      summaryText.innerHTML = `Showing <strong>${totalMatchingChanges} changes</strong> in <strong>${matchingReleasesCount} releases</strong>${archiveSummaryText}`;
    } else {
      const summaryMessage = createTag('span');
      summaryMessage.innerHTML = `Showing <strong>${totalMatchingChanges} changes</strong> in <strong>${matchingReleasesCount} releases</strong> · `;
      const clearFiltersButton = createTag('button', { type: 'button', class: 'spectrum-Link changelog-clear-link' });
      clearFiltersButton.textContent = 'Clear filters';
      clearFiltersButton.addEventListener('click', clearAllFilters);
      summaryText.append(summaryMessage, clearFiltersButton);
    }
  }

  function clearAllFilters() {
    filterState.modules.clear();
    filterState.year = 'all';
    filterState.month = 'all';
    filterState.types.clear();

    if (moduleMultiSelect) {
      moduleMultiSelect.update(filterState.modules);
    }
    if (moduleSingleSelect) {
      moduleSingleSelect.setValue('all');
    }
    if (yearSingleSelect) {
      yearSingleSelect.setValue('all');
    }
    if (typeSingleSelect) {
      typeSingleSelect.setValue('all');
    }
    if (typeMultiSelect) {
      typeMultiSelect.update(filterState.types);
    }
    updateMonthControlOptions();
    if (monthSingleSelect) {
      monthSingleSelect.setValue('all');
    }

    writeToUrl();
    applyFilters();
  }

  function applyFilters() {
    const { matchingReleases, totalMatchingChanges } = getFilteredData();
    renderPills();
    renderReleasesList(matchingReleases);
    updateSummary(totalMatchingChanges, matchingReleases.length);
  }

  container.append(headerSection, filterCard, resultsContainer);
  if (isArchiveEnabled && totalArchivedReleasesCount > 0) {
    container.append(archiveSection);
  }
  block.appendChild(container);

  applyFilters();
}
