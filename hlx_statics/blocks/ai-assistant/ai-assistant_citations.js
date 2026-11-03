// @ts-check

/** @typedef {{url: string, title: string}} Source */
/** @typedef {{start: number, end: number, sourceUrls: string[]}} Placement */

/** Preserve exact-string identity while enforcing the existing HTTPS-only policy. */
export function isSourceUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

const nonblank = (value) => (typeof value === "string" ? value.trim() : "");

const isValidRange = (range, content) => range && Number.isInteger(range.start)
  && Number.isInteger(range.end) && range.start >= 0
  && range.end > range.start && range.end <= content.length;

// One group per endpoint. Its encompassing range retains validated raw offsets;
// starts do not affect marker placement or numbering.
const addPlacement = (endpoints, { start, end }, sourceUrls) => {
  if (!endpoints.has(end)) endpoints.set(end, { start, end, urls: new Set() });
  const group = endpoints.get(end);
  group.start = Math.min(group.start, start);
  sourceUrls.forEach((url) => group.urls.add(url));
};

const orderedPlacements = (endpoints) => [...endpoints.values()]
  .sort((a, b) => a.end - b.end)
  .map(({ start, end, urls }) => ({ start, end, sourceUrls: [...urls] }));

/**
 * Validate saved placements without rebuilding event order, titles or numbering.
 * Only identities in the saved valid registry may become links. Legacy sources
 * use their existing rendering path instead.
 * @param {string} content
 * @param {unknown} references
 * @param {unknown} citations
 * @returns {{references: Source[], placements: Placement[]}}
 */
export function restoreCitations(content, references, citations) {
  const sources = new Map();
  if (Array.isArray(references)) {
    references.forEach((reference) => {
      if (isSourceUrl(reference?.url) && !sources.has(reference.url)) {
        sources.set(reference.url, {
          url: reference.url,
          title: typeof reference.title === "string" && reference.title ? reference.title : reference.url,
        });
      }
    });
  }
  const endpoints = new Map();
  if (Array.isArray(citations)) {
    citations.forEach((placement) => {
      if (!isValidRange(placement, content) || !Array.isArray(placement.sourceUrls)) return;
      const urls = placement.sourceUrls.filter((url) => sources.has(url));
      if (urls.length) addPlacement(endpoints, placement, urls);
    });
  }
  const numbers = new Map([...sources.keys()].map((url, index) => [url, index]));
  const placements = orderedPlacements(endpoints);
  placements.forEach(({ sourceUrls }) => sourceUrls.sort((a, b) => numbers.get(a) - numbers.get(b)));
  return { references: [...sources.values()], placements };
}

/**
 * Build one numbered registry in first visible endpoint order. Valid sources with
 * unusable locations follow inline sources, in first-received order.
 * textRange uses exclusive offsets into unchanged raw Markdown.
 * @param {string} content
 * @param {unknown[]} citations - Untrusted JSON citation payloads, in event order
 * @returns {{references: Source[], placements: Placement[]}}
 */
export function normalizeCitations(content, citations) {
  const sources = new Map();
  const endpoints = new Map();
  citations.forEach((citation) => {
    if (!citation || typeof citation !== "object" || Array.isArray(citation)) return;
    const { retrievedReferences, textRange } = /** @type {import('./ai-assistant_api-client.js').Citation} */ (citation);
    if (!Array.isArray(retrievedReferences)) return;
    const validRange = isValidRange(textRange, content);
    retrievedReferences.forEach((reference) => {
      const url = reference?.metadata?.url;
      if (!isSourceUrl(url)) return;
      const metadataTitle = nonblank(reference?.metadata?.title);
      const label = nonblank(reference?.label);
      const priority = metadataTitle ? 2 : Number(Boolean(label));
      const title = metadataTitle || label || url;
      const existing = sources.get(url);
      if (!existing || priority > existing.priority) sources.set(url, { url, title, priority });
      if (validRange) {
        addPlacement(endpoints, textRange, [url]);
      }
    });
  });

  const numbered = new Map();
  const addSource = (url) => {
    if (!numbered.has(url)) {
      const { title } = sources.get(url);
      numbered.set(url, { url, title });
    }
  };
  const placements = orderedPlacements(endpoints);
  placements.forEach(({ sourceUrls }) => sourceUrls.forEach(addSource));
  sources.forEach((source, url) => addSource(url));
  const numbers = new Map([...numbered.keys()].map((url, index) => [url, index + 1]));
  placements.forEach(({ sourceUrls }) => sourceUrls.sort((a, b) => numbers.get(a) - numbers.get(b)));
  return { references: [...numbered.values()], placements };
}
