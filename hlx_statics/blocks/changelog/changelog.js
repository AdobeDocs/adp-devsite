import { createTag } from '../../scripts/lib-adobeio.js';
import { fetchChangelog } from '../../scripts/lib-helix.js';

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
function getIconSvg(changeType) {
  const iconSvgs = {
    breaking: '<svg class="changelog-type-icon icon-breaking" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="#D31510" d="M8 1l7 7-7 7-7-7z"/></svg>',
    removed: '<svg class="changelog-type-icon icon-removed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="#D31510" stroke-width="2" d="M8 2.5l5.5 5.5-5.5 5.5-5.5-5.5z"/></svg>',
    deprecated: '<svg class="changelog-type-icon icon-deprecated" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="#E68619" d="M8 2l7 12H1z"/></svg>',
    new: '<svg class="changelog-type-icon icon-new" viewBox="0 0 16 16" width="9" height="9" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="#0265DC"/></svg>',
    improved: '<svg class="changelog-type-icon icon-improved" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="#0265DC" stroke-width="2"/></svg>',
    fixed: '<svg class="changelog-type-icon icon-fixed" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.5 3.5 6.5-7"/></svg>',
    docs: '<svg class="changelog-type-icon icon-docs" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="#505050" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 2h5.5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path fill="none" stroke="#505050" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 2v4h4"/></svg>',
    chevron: '<svg class="changelog-chevron-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>',
  };
  return iconSvgs[changeType] || '';
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
 * Format markdown inline code (`code`), bold (**text**), italic (*text*), and links ([text](url)).
 */
function renderMarkdown(markdownText) {
  if (!markdownText) {
    return '';
  }
  let formattedHtml = String(markdownText);
  // Code chips `code`
  formattedHtml = formattedHtml.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links [text](url)
  formattedHtml = formattedHtml.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkLabel, linkUrl) => {
    const isExternalLink = /^https?:\/\//i.test(linkUrl);
    const targetAttribute = isExternalLink ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${linkUrl}"${targetAttribute}>${linkLabel}</a>`;
  });
  // Bold **text**
  formattedHtml = formattedHtml.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  formattedHtml = formattedHtml.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return formattedHtml;
}

/**
 * Parses date string (ISO YYYY-MM-DD, or fallback) into structured date metadata.
 */
function parseDate(dateString) {
  const trimmedDateString = (dateString || '').trim();
  if (!trimmedDateString) {
    return { year: '', monthName: '', displayDate: '', rawDate: '' };
  }

  const isoDateMatch = trimmedDateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const monthName = utcDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
    const displayDate = utcDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return {
      year,
      monthName,
      displayDate,
      rawDate: `${year}-${month}-${day}`,
    };
  }

  const parsedDate = new Date(trimmedDateString);
  if (!isNaN(parsedDate.getTime())) {
    const year = String(parsedDate.getUTCFullYear());
    const monthName = parsedDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
    const displayDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const monthNumber = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
    const dayNumber = String(parsedDate.getUTCDate()).padStart(2, '0');
    return {
      year,
      monthName,
      displayDate,
      rawDate: `${year}-${monthNumber}-${dayNumber}`,
    };
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
 * Finds the matching archive group definition for a given release item.
 */
function findMatchingArchiveGroup(releaseItem, archiveGroupsList) {
  if (!archiveGroupsList || !Array.isArray(archiveGroupsList) || archiveGroupsList.length === 0) {
    return null;
  }

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

    if (isKindMatching && isVersionMatching) {
      return archiveGroupDefinition;
    }
  }

  // If the release has a pre-v4 summary field but did not match a specific version range, assign to the first archive group
  if (releaseItem.summary && archiveGroupsList.length > 0) {
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
  const configuredArchiveGroups = Array.isArray(archiveConfiguration?.groups) ? archiveConfiguration.groups : [];
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
  const defaultReleaseKind = parsedReleasesMetadata?.defaultKind
    || rawReleasesList.find((releaseItem) => releaseItem.version && releaseItem.kind)?.kind
    || '';

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
    const releaseChanges = Array.isArray(releaseItem.changes) ? releaseItem.changes.map((changeItem) => ({
      type: (changeItem.type || 'new').toLowerCase(),
      modules: Array.isArray(changeItem.modules) ? changeItem.modules : (changeItem.modules ? [changeItem.modules] : []),
      text: changeItem.text || '',
      action: changeItem.action || '',
      open: Boolean(changeItem.open),
    })) : [];

    releases.push({
      version: releaseItem.version || '',
      date: displayDate,
      rawDate,
      year,
      monthName,
      kind: releaseItem.kind || '',
      title: releaseItem.title || '',
      isLatest: isLatestRelease,
      changes: releaseChanges,
    });
  });

  // Extract filter definitions from metadata
  const configuredFilters = parsedReleasesMetadata
    ? (Array.isArray(parsedReleasesMetadata.filters) ? parsedReleasesMetadata.filters : [])
    : null;

  const isFilterConfigured = (filterId) => {
    if (configuredFilters === null) {
      return true;
    }
    return configuredFilters.some((filterDefinition) => filterDefinition.id === filterId);
  };

  const showModuleFilter = isFilterConfigured('module');
  const showYearFilter = isFilterConfigured('year');
  const showMonthFilter = isFilterConfigured('month');

  const moduleFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'module');
  const yearFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'year');
  const monthFilterMetadata = (parsedReleasesMetadata?.filters || []).find((filterDefinition) => filterDefinition.id === 'month');

  let moduleOptions = [];
  if (showModuleFilter) {
    if (moduleFilterMetadata?.options && Array.isArray(moduleFilterMetadata.options)) {
      moduleOptions = moduleFilterMetadata.options.map((optionItem) => ({
        value: optionItem.id,
        text: optionItem.label || modulesMap[optionItem.id] || optionItem.id,
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
      yearOptions = Array.from(new Set(releases.map((releaseEntry) => releaseEntry.year).filter(Boolean))).sort((yearA, yearB) => yearB.localeCompare(yearA));
    }
  }

  const latestRelease = releases[0] || null;
  const filterState = { module: 'all', year: 'all', month: 'all', types: new Set() };

  function readFromUrl() {
    const searchParameters = new URLSearchParams(window.location.search);
    const moduleQueryParameter = searchParameters.get('module');
    const yearQueryParameter = searchParameters.get('year');
    const monthQueryParameter = searchParameters.get('month');
    const typesQueryParameter = searchParameters.get('types') || searchParameters.get('type');

    if (showModuleFilter && moduleQueryParameter && (moduleQueryParameter === 'all' || moduleOptions.some((optionItem) => optionItem.value === moduleQueryParameter))) {
      filterState.module = moduleQueryParameter;
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
        const matchedType = ALL_TYPES.find((typeItem) => typeItem.key.toLowerCase() === typeKey.trim().toLowerCase());
        if (matchedType) {
          filterState.types.add(matchedType.key);
        }
      });
    }
  }

  function writeToUrl() {
    const searchParameters = new URLSearchParams(window.location.search);
    if (filterState.module && filterState.module !== 'all') {
      searchParameters.set('module', filterState.module);
    } else {
      searchParameters.delete('module');
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
    descriptionParagraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL changelog-description' });
    descriptionParagraph.textContent = descriptionText;
  }

  const subHeaderContainer = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-sub-header' });
  const latestInfoSpan = createTag('span', { class: 'changelog-latest-info' });
  if (latestRelease && (latestRelease.version || latestRelease.date)) {
    const latestReleaseParts = [
      latestRelease.version ? `<strong>${latestRelease.version}</strong>` : (latestRelease.title ? `<strong>${latestRelease.title}</strong>` : ''),
      latestRelease.date,
    ].filter(Boolean);
    latestInfoSpan.innerHTML = `Latest: ${latestReleaseParts.join(' · ')}`;
  }

  const quickLinksContainer = createTag('div', { class: 'changelog-quick-links' });
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

  subHeaderContainer.append(latestInfoSpan, quickLinksContainer);
  if (descriptionParagraph) {
    headerSection.append(titleHeading, descriptionParagraph, subHeaderContainer);
  } else {
    headerSection.append(titleHeading, subHeaderContainer);
  }

  // 2. Filter Card
  const filterCard = createTag('section', { id: 'filters', class: 'changelog-filter-card', 'aria-label': 'Changelog filters' });
  const dropdownRow = createTag('div', { class: 'changelog-filter-row-dropdowns' });

  function createDropdownGroup(id, labelText, options, currentValue) {
    const groupContainer = createTag('div', { class: 'changelog-filter-group' });
    const labelElement = createTag('label', { class: 'spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label', for: id });
    labelElement.textContent = labelText;
    const selectElement = createTag('select', { id, name: id.replace('changelog-filter-', ''), 'aria-label': `Filter by ${labelText}` });
    options.forEach(({ value, text }) => {
      const optionElement = createTag('option', { value });
      optionElement.textContent = text;
      if (String(value).toLowerCase() === String(currentValue).toLowerCase()) {
        optionElement.selected = true;
      }
      selectElement.appendChild(optionElement);
    });
    groupContainer.append(labelElement, selectElement);
    return { group: groupContainer, select: selectElement };
  }

  let moduleSelect = null;
  if (showModuleFilter) {
    const { group: moduleGroup, select } = createDropdownGroup(
      'changelog-filter-module',
      moduleFilterMetadata?.label || 'Module',
      [{ value: 'all', text: moduleFilterMetadata?.allLabel || 'All modules' }, ...moduleOptions],
      filterState.module,
    );
    moduleSelect = select;
    dropdownRow.append(moduleGroup);
  }

  let yearSelect = null;
  if (showYearFilter) {
    const { group: yearGroup, select } = createDropdownGroup(
      'changelog-filter-year',
      yearFilterMetadata?.label || 'Year',
      [{ value: 'all', text: yearFilterMetadata?.allLabel || 'All years' }, ...yearOptions.map((yearOption) => ({ value: yearOption, text: yearOption }))],
      filterState.year,
    );
    yearSelect = select;
    dropdownRow.append(yearGroup);
  }

  function getMonthOptionsForYear(selectedYear) {
    const allMonthsLabel = monthFilterMetadata?.allLabel || 'All months';
    let rawMonthNames = [];

    if (selectedYear !== 'all') {
      rawMonthNames = monthFilterMetadata?.optionsByYear?.[selectedYear]
        || Array.from(new Set(releases.filter((releaseEntry) => releaseEntry.year === selectedYear).map((releaseEntry) => releaseEntry.monthName).filter(Boolean)));
    } else if (monthFilterMetadata?.optionsByYear) {
      rawMonthNames = Array.from(new Set(Object.values(monthFilterMetadata.optionsByYear).flat()));
    } else if (Array.isArray(monthFilterMetadata?.options)) {
      rawMonthNames = monthFilterMetadata.options.map((optionItem) => (
        typeof optionItem === 'object' ? (optionItem.label || optionItem.id) : optionItem
      ));
    } else {
      rawMonthNames = Array.from(new Set(releases.map((releaseEntry) => releaseEntry.monthName).filter(Boolean)));
    }

    const sortedMonthNames = [...rawMonthNames].sort((firstMonth, secondMonth) => {
      const firstMonthDate = new Date(Date.parse(`${firstMonth} 1, 2000`));
      const secondMonthDate = new Date(Date.parse(`${secondMonth} 1, 2000`));
      return (firstMonthDate.getMonth() || 0) - (secondMonthDate.getMonth() || 0);
    });

    return [
      { value: 'all', text: allMonthsLabel },
      ...sortedMonthNames.map((monthName) => ({ value: monthName, text: monthName })),
    ];
  }

  let monthSelect = null;
  if (showMonthFilter) {
    const { group: monthGroup, select } = createDropdownGroup(
      'changelog-filter-month',
      monthFilterMetadata?.label || 'Month',
      getMonthOptionsForYear(filterState.year),
      filterState.month,
    );
    monthSelect = select;
    dropdownRow.append(monthGroup);
  }

  const typeRow = createTag('div', { class: 'changelog-filter-row-types' });
  typeRow.innerHTML = '<div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM changelog-filter-label">Type of change</div>';
  const pillsContainer = createTag('div', { class: 'changelog-filter-pills', role: 'group', 'aria-label': 'Filter by change type' });
  typeRow.append(pillsContainer);

  const summaryRow = createTag('div', { class: 'changelog-filter-summary-row' });
  const summaryText = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS changelog-filter-summary-text', 'aria-live': 'polite' });
  summaryRow.append(summaryText);
  if (showModuleFilter || showYearFilter || showMonthFilter) {
    filterCard.append(dropdownRow);
  }
  filterCard.append(typeRow, summaryRow);

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

  function updateMonthSelectOptions() {
    if (!monthSelect) {
      return;
    }
    const updatedMonthOptions = getMonthOptionsForYear(filterState.year);
    monthSelect.innerHTML = '';
    let hasCurrentSelection = false;

    updatedMonthOptions.forEach(({ value, text }) => {
      const optionElement = createTag('option', { value });
      optionElement.textContent = text;
      if (String(value).toLowerCase() === String(filterState.month).toLowerCase()
        || (filterState.month !== 'all' && text.toLowerCase() === String(filterState.month).toLowerCase())) {
        optionElement.selected = true;
        hasCurrentSelection = true;
      }
      monthSelect.appendChild(optionElement);
    });

    if (!hasCurrentSelection && filterState.month !== 'all') {
      filterState.month = 'all';
      monthSelect.value = 'all';
      writeToUrl();
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
        if (filterState.module === 'all' && filterState.types.size === 0) {
          matchingReleases.push(releaseItem);
        }
        return;
      }

      const matchingChanges = releaseItem.changes.filter((changeItem) => {
        if (filterState.module !== 'all' && !changeItem.modules.includes(filterState.module)) {
          return false;
        }
        if (filterState.types.size > 0 && !filterState.types.has(changeItem.type)) {
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
    pillsContainer.innerHTML = '';
    const changeTypeCounts = { all: 0 };
    ALL_TYPES.forEach((typeDefinition) => { changeTypeCounts[typeDefinition.key] = 0; });

    releases.forEach((releaseItem) => {
      if (filterState.year !== 'all' && releaseItem.year !== filterState.year) {
        return;
      }
      if (!matchesMonth(releaseItem)) {
        return;
      }

      releaseItem.changes.forEach((changeItem) => {
        if (filterState.module !== 'all' && !changeItem.modules.includes(filterState.module)) {
          return;
        }
        changeTypeCounts.all += 1;
        if (changeTypeCounts[changeItem.type] !== undefined) {
          changeTypeCounts[changeItem.type] += 1;
        }
      });
    });

    const isAllTypesSelected = filterState.types.size === 0;
    const allPill = createTag('button', {
      type: 'button',
      class: `changelog-pill ${isAllTypesSelected ? 'is-selected' : ''}`,
      'aria-pressed': String(isAllTypesSelected),
    });
    allPill.innerHTML = `<span>All types</span> <span class="changelog-pill-count">${changeTypeCounts.all}</span>`;
    allPill.addEventListener('click', () => {
      filterState.types.clear();
      writeToUrl();
      applyFilters();
    });
    pillsContainer.appendChild(allPill);

    ALL_TYPES.forEach((typeDefinition) => {
      const isSelected = filterState.types.has(typeDefinition.key);
      const typePill = createTag('button', {
        type: 'button',
        class: `changelog-pill ${isSelected ? 'is-selected' : ''}`,
        'aria-pressed': String(isSelected),
      });
      typePill.innerHTML = `${getIconSvg(typeDefinition.icon)} <span>${typeDefinition.label}</span> <span class="changelog-pill-count">${changeTypeCounts[typeDefinition.key]}</span>`;
      typePill.addEventListener('click', () => {
        if (filterState.types.has(typeDefinition.key)) {
          filterState.types.delete(typeDefinition.key);
        } else {
          filterState.types.add(typeDefinition.key);
        }
        writeToUrl();
        applyFilters();
      });
      pillsContainer.appendChild(typePill);
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

    const releasesByYear = new Map();
    matchingReleases.forEach((releaseItem) => {
      if (!releasesByYear.has(releaseItem.year)) {
        releasesByYear.set(releaseItem.year, []);
      }
      releasesByYear.get(releaseItem.year).push(releaseItem);
    });

    releasesByYear.forEach((releasesInYear, year) => {
      const yearSection = createTag('section', { class: 'changelog-year-section', 'aria-labelledby': `heading-year-${year}` });
      yearSection.innerHTML = `
        <div class="heading2 changelog-toc-target"><h2 id="${year}" class="spectrum-Heading spectrum-Heading--sizeM changelog-year-heading">${year}</h2></div>
        <div class="changelog-release-list"></div>
      `;
      const releaseList = yearSection.querySelector('.changelog-release-list');

      releasesInYear.forEach((releaseItem) => {
        const cardId = (releaseItem.version ? releaseItem.version.replace(/\./g, '-') : `docs-${releaseItem.rawDate}`);
        const releaseCard = createTag('article', { class: 'changelog-release-card', id: cardId });

        let badgeHtml = '';
        if (releaseItem.isLatest) {
          badgeHtml = '<span class="changelog-badge changelog-badge-latest">Latest</span>';
        } else if (releaseItem.kind && releaseKindsMap[releaseItem.kind]) {
          if (!releaseItem.version || releaseItem.kind !== defaultReleaseKind) {
            badgeHtml = `<span class="changelog-badge">${releaseKindsMap[releaseItem.kind]}</span>`;
          }
        } else if (releaseItem.kind && releaseItem.kind !== defaultReleaseKind) {
          badgeHtml = `<span class="changelog-badge">${releaseItem.kind}</span>`;
        }

        let changesHtml = '';
        if (releaseItem.changes.length === 0) {
          changesHtml = `
            <div class="changelog-change-row">
              <div class="changelog-change-content">
                <div class="spectrum-Body spectrum-Body--sizeM changelog-change-description">Maintenance release.</div>
              </div>
            </div>
          `;
        } else {
          changesHtml = releaseItem.changes.map((changeItem) => {
            const iconType = ALL_TYPES.find((typeItem) => typeItem.key === changeItem.type)?.icon || 'new';
            const typeLabel = ALL_TYPES.find((typeItem) => typeItem.key === changeItem.type)?.label || changeItem.type;
            const moduleLabels = (changeItem.modules || []).map((moduleId) => modulesMap[moduleId] || moduleId).filter(Boolean);
            const moduleHtml = moduleLabels.length > 0
              ? `<div class="spectrum-Detail spectrum-Detail--sizeS changelog-change-module">${renderMarkdown(moduleLabels.join(', '))}</div>`
              : '';

            const openBadgeHtml = changeItem.open ? '<span class="changelog-badge changelog-badge-open">Still open</span>' : '';
            const actionHtml = changeItem.action ? `
              <div class="changelog-what-to-do type-${changeItem.type}">
                <strong class="what-to-do-title">What to do:</strong>
                <span>${renderMarkdown(changeItem.action)}</span>
              </div>
            ` : '';

            return `
              <div class="changelog-change-row type-${changeItem.type}">
                <div class="changelog-change-type-col">
                  <div class="spectrum-Body spectrum-Body--sizeS spectrum-Body-strong changelog-change-type type-${changeItem.type}">
                    ${getIconSvg(iconType)} <span>${typeLabel}</span>
                  </div>
                  ${moduleHtml}
                </div>
                <div class="changelog-change-content">
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

        const releaseHeading = releaseItem.version
          ? (releaseItem.title ? `${releaseItem.version} · ${releaseItem.title}` : releaseItem.version)
          : (releaseItem.title || releaseKindsMap[releaseItem.kind] || 'Update');

        releaseCard.innerHTML = `
          <div class="changelog-release-meta">
            <h3 class="spectrum-Heading spectrum-Heading--sizeS changelog-release-version">${releaseHeading}</h3>
            <time class="spectrum-Body spectrum-Body--sizeS changelog-release-date" datetime="${releaseItem.rawDate}">${releaseItem.date}</time>
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
    filterState.module = 'all';
    filterState.year = 'all';
    filterState.month = 'all';
    filterState.types.clear();

    if (moduleSelect) {
      moduleSelect.value = 'all';
    }
    if (yearSelect) {
      yearSelect.value = 'all';
    }
    updateMonthSelectOptions();
    if (monthSelect) {
      monthSelect.value = 'all';
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

  if (moduleSelect) {
    moduleSelect.addEventListener('change', (event) => {
      filterState.module = event.target.value;
      writeToUrl();
      applyFilters();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', (event) => {
      filterState.year = event.target.value;
      updateMonthSelectOptions();
      writeToUrl();
      applyFilters();
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', (event) => {
      filterState.month = event.target.value;
      writeToUrl();
      applyFilters();
    });
  }

  container.append(headerSection, filterCard, resultsContainer);
  if (isArchiveEnabled && totalArchivedReleasesCount > 0) {
    container.append(archiveSection);
  }
  block.appendChild(container);

  applyFilters();
}
