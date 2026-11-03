// @ts-check

/** @typedef {{url: string, title: string}} Source */
/**
 * A marker group. `end` is the Markdown offset where the marker is inserted:
 * the cited range's endpoint, or the end of an earlier line in the range when
 * the endpoint itself is unsafe (see markerOffset).
 * @typedef {{start: number, end: number, sourceUrls: string[]}} Placement
 */
/** @typedef {(markdown: string) => string} RenderMarkdown */

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

const PROBE_ATTRIBUTE = "data-citation-probe";
const PROBE = `<span ${PROBE_ATTRIBUTE}=""></span>`;

/**
 * Citation offsets index raw Markdown, and the backend does not keep them
 * Markdown-safe: a range ending a part that closes with a code fence ends
 * directly after the fence, where any inserted HTML stops the fence from
 * closing. A marker offset is usable only when a probe there renders as an
 * element outside links and code and leaves the rest of the answer unchanged.
 * @param {string} content
 * @param {RenderMarkdown} render - The renderer used to display the answer
 * @returns {(offset: number) => boolean}
 */
const createMarkerGuard = (content, render) => {
  /** @type {string | undefined} */
  let baseline;
  const results = new Map();
  const isUsable = (offset) => {
    baseline ??= render(content);
    const html = render(content.slice(0, offset) + PROBE + content.slice(offset));
    const index = html.indexOf(PROBE);
    if (index < 0 || html.slice(0, index) + html.slice(index + PROBE.length) !== baseline) {
      return false;
    }
    const template = document.createElement("template");
    template.innerHTML = html;
    const probe = template.content.querySelector(`[${PROBE_ATTRIBUTE}]`);
    return probe !== null && !probe.closest("a, code, pre");
  };
  return (offset) => {
    if (!results.has(offset)) results.set(offset, isUsable(offset));
    return results.get(offset);
  };
};

/**
 * The latest usable marker offset in (start, end]: the endpoint itself, or else
 * the end of an earlier line in the range, such as the prose introducing a code
 * block or table. Moving back keeps the marker within the cited text.
 * @param {{start: number, end: number}} range
 * @param {string} content
 * @param {(offset: number) => boolean} isUsable
 * @returns {number} The offset, or -1 when the range has no usable position
 */
const markerOffset = ({ start, end }, content, isUsable) => {
  if (isUsable(end)) return end;
  for (let lineEnd = content.lastIndexOf("\n", end - 1); lineEnd > start;
    lineEnd = content.lastIndexOf("\n", lineEnd - 1)) {
    let offset = lineEnd;
    while (offset > start && /[ \t\r]/.test(content[offset - 1])) offset -= 1;
    if (offset > start && content[offset - 1] !== "\n" && isUsable(offset)) return offset;
  }
  return -1;
};

/**
 * @param {string} content
 * @param {RenderMarkdown} render
 * @returns {(range: {start: number, end: number}) => number}
 */
const createMarkerLocator = (content, render) => {
  const isUsable = createMarkerGuard(content, render);
  return (range) => markerOffset(range, content, isUsable);
};

// One group per marker offset. Its encompassing range retains validated raw
// starts; starts do not affect marker placement or numbering.
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
 * use their existing rendering path instead. Saved offsets are rechecked, so
 * entries saved with unsafe offsets are moved or dropped like new ones.
 * @param {string} content
 * @param {unknown} references
 * @param {unknown} citations
 * @param {RenderMarkdown} render - The renderer used to display the answer
 * @returns {{references: Source[], placements: Placement[]}}
 */
export function restoreCitations(content, references, citations, render) {
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
  const locateMarker = createMarkerLocator(content, render);
  if (Array.isArray(citations)) {
    citations.forEach((placement) => {
      if (!isValidRange(placement, content) || !Array.isArray(placement.sourceUrls)) return;
      const urls = placement.sourceUrls.filter((url) => sources.has(url));
      if (!urls.length) return;
      const end = locateMarker(placement);
      if (end >= 0) addPlacement(endpoints, { start: placement.start, end }, urls);
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
 * @param {RenderMarkdown} render - The renderer used to display the answer
 * @returns {{references: Source[], placements: Placement[]}}
 */
export function normalizeCitations(content, citations, render) {
  const sources = new Map();
  const endpoints = new Map();
  const locateMarker = createMarkerLocator(content, render);
  citations.forEach((citation) => {
    if (!citation || typeof citation !== "object" || Array.isArray(citation)) return;
    const { retrievedReferences, textRange } = /** @type {import('./ai-assistant_api-client.js').Citation} */ (citation);
    if (!Array.isArray(retrievedReferences)) return;
    const end = isValidRange(textRange, content) ? locateMarker(textRange) : -1;
    retrievedReferences.forEach((reference) => {
      const url = reference?.metadata?.url;
      if (!isSourceUrl(url)) return;
      const metadataTitle = nonblank(reference?.metadata?.title);
      const label = nonblank(reference?.label);
      const priority = metadataTitle ? 2 : Number(Boolean(label));
      const title = metadataTitle || label || url;
      const existing = sources.get(url);
      if (!existing || priority > existing.priority) sources.set(url, { url, title, priority });
      if (end >= 0) addPlacement(endpoints, { start: textRange.start, end }, [url]);
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
