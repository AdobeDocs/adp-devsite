// @ts-check

/** @typedef {{url: string, title: string}} Source */
/** @typedef {{end: number, urls: string[]}} Placement */

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
    const validRange = textRange && Number.isInteger(textRange.start)
      && Number.isInteger(textRange.end) && textRange.start >= 0
      && textRange.end > textRange.start && textRange.end <= content.length;
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
        if (!endpoints.has(textRange.end)) endpoints.set(textRange.end, new Set());
        endpoints.get(textRange.end).add(url);
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
  const placements = [...endpoints.entries()].sort(([a], [b]) => a - b)
    .map(([end, urls]) => {
      urls.forEach(addSource);
      return { end, urls: [...urls] };
    });
  sources.forEach((source, url) => addSource(url));
  const numbers = new Map([...numbered.keys()].map((url, index) => [url, index + 1]));
  placements.forEach(({ urls }) => urls.sort((a, b) => numbers.get(a) - numbers.get(b)));
  return { references: [...numbered.values()], placements };
}
