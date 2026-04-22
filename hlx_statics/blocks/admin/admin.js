
import { getdevsitePathFile, fetchSitemapXml, getSitemapFetchOrigin } from '../../scripts/lib-adobeio.js';

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/**
 * Normalizes a path or pathPrefix for comparison (leading `/`, no trailing slash except `/`).
 * @param {string} p
 */
function normalizePathForMatch(p) {
  if (p == null || p === '') return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) {
    s = `/${s}`;
  }
  if (s.length > 1 && s.endsWith('/')) {
    s = s.slice(0, -1);
  }
  return s;
}

/**
 * Full path for a tree segment: `parentPath` is `''` at the site root.
 * @param {string} parentPath
 * @param {string} segment
 */
function segmentPath(parentPath, segment) {
  if (!parentPath) {
    return `/${segment}`;
  }
  return `${parentPath.replace(/\/$/, '')}/${segment}`;
}

/**
 * Fragment id for a normalized path: `#admin-sitemap-path-to-url` (slashes → hyphens).
 * Root is `#admin-sitemap-root`. Rare ambiguity if a segment name equals multiple segments joined by `-`.
 * @param {string} fullPath
 */
function treeFragmentIdFromPath(fullPath) {
  const n = normalizePathForMatch(fullPath || '/');
  if (n === '/') return 'admin-sitemap-root';
  return `admin-sitemap-${n.slice(1).replace(/\//g, '-')}`;
}

/**
 * Opens every ancestor `details` of `el` inside `mount`, then scrolls `el` into view.
 * @param {HTMLElement} mount
 * @param {string} [fragmentId] defaults to `location.hash` without `#`
 */
function syncHashToTree(mount, fragmentId) {
  const id = fragmentId ?? window.location.hash.slice(1);
  if (!id) return;
  const el = document.getElementById(id);
  if (!el || !mount.contains(el)) return;
  let p = el.parentElement;
  while (p && p !== mount) {
    if (p instanceof HTMLDetailsElement && p.classList.contains('admin-site-tree__node')) {
      p.open = true;
    }
    p = p.parentElement;
  }
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/**
 * @param {HTMLAnchorElement} a
 * @param {string} fragId
 * @param {HTMLElement} treeMount
 */
function bindTreePermalinkAnchor(a, fragId, treeMount) {
  a.href = `#${fragId}`;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.hash = fragId;
    syncHashToTree(treeMount, fragId);
  });
}

/**
 * True if some sitemap URL pathname matches this prefix (exact or nested under it).
 * @param {string} normalizedPrefix
 * @param {string[]} sitemapUrls
 */
function pathPrefixMatchesSitemap(normalizedPrefix, sitemapUrls) {
  if (normalizedPrefix === '/') {
    return sitemapUrls.length > 0;
  }
  for (const href of sitemapUrls) {
    let pn;
    try {
      pn = normalizePathForMatch(new URL(href).pathname);
    } catch {
      continue;
    }
    if (pn === normalizedPrefix || pn.startsWith(`${normalizedPrefix}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * Maps normalized pathPrefix → first row; `crossRefSet` = prefixes that also appear in the sitemap.
 * @param {object[]|undefined} data devsitepaths `data` array
 * @param {string[]} sitemapUrls
 */
function buildCrossReferencedDevsitePaths(data, sitemapUrls) {
  /** @type {Map<string, object>} */
  const lookup = new Map();
  if (data?.length) {
    for (const row of data) {
      if (!row || typeof row.pathPrefix !== 'string') continue;
      const n = normalizePathForMatch(row.pathPrefix);
      if (!lookup.has(n)) {
        lookup.set(n, row);
      }
    }
  }
  const crossRefSet = new Set();
  for (const n of lookup.keys()) {
    if (pathPrefixMatchesSitemap(n, sitemapUrls)) {
      crossRefSet.add(n);
    }
  }
  return { crossRefSet, lookup };
}

/**
 * @param {HTMLElement} parent
 * @param {object} row devsitepaths row
 */
function appendDevsitepathsMatchNote(parent, row) {
  const wrap = document.createElement('span');
  wrap.className = 'admin-site-tree__devsitepaths-wrap';

  const note = document.createElement('span');
  note.className = 'admin-site-tree__devsitepaths-match';
  note.textContent = 'devdocs';

  const owner = typeof row.owner === 'string' ? row.owner.trim() : '';
  const repoName = typeof row.repo === 'string' ? row.repo.trim() : '';
  const slug = owner && repoName ? `${owner}/${repoName}` : '';
  const githubUrl = owner && repoName ? `https://github.com/${owner}/${repoName}` : '';

  note.title = slug
    ? `Matches devsitepaths.json: ${slug} · pathPrefix ${row.pathPrefix}${githubUrl ? `\ngithub url: ${githubUrl}` : ''}`
    : `Matches devsitepaths.json · pathPrefix ${row.pathPrefix}`;

  wrap.append(note);

  if (githubUrl) {
    const gh = document.createElement('a');
    gh.className = 'admin-site-tree__github-ref';
    gh.href = githubUrl;
    gh.target = '_blank';
    gh.rel = 'noopener noreferrer';
    gh.textContent = `github url: ${githubUrl}`;
    gh.title = githubUrl;
    wrap.append(gh);
  }

  parent.append(wrap);
}

/**
 * @returns {Promise<{ bundle: { document: Document, text: string }, baseUrl: string }|null>}
 */
async function loadSitemapForAdmin() {
  try {
    const bundle = await fetchSitemapXml();
    if (!bundle) {
      return null;
    }
    return { bundle, baseUrl: getSitemapFetchOrigin() };
  } catch {
    return null;
  }
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractLocUrlsFromXmlText(text) {
  const urls = [];
  const re = /<loc[^>]*>([\s\S]*?)<\/loc>/gi;
  let m = re.exec(text);
  while (m !== null) {
    const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    if (raw) {
      try {
        urls.push(new URL(raw).href);
      } catch {
        /* skip */
      }
    }
    m = re.exec(text);
  }
  return urls;
}

/**
 * @param {Document} sitemapDoc
 * @param {string} [rawXmlText]
 * @returns {string[]}
 */
function extractSitemapLocUrls(sitemapDoc, rawXmlText) {
  /** @type {Element[]} */
  const locElements = [];
  let locs = sitemapDoc.getElementsByTagNameNS(SITEMAP_NS, 'loc');
  for (let i = 0; i < locs.length; i += 1) {
    locElements.push(locs[i]);
  }
  if (!locElements.length) {
    locs = sitemapDoc.getElementsByTagName('loc');
    for (let i = 0; i < locs.length; i += 1) {
      locElements.push(locs[i]);
    }
  }
  if (!locElements.length) {
    const star = sitemapDoc.getElementsByTagName('*');
    for (let i = 0; i < star.length; i += 1) {
      const el = star[i];
      if (el.localName === 'loc') {
        locElements.push(el);
      }
    }
  }
  const urls = [];
  for (let i = 0; i < locElements.length; i += 1) {
    const text = locElements[i].textContent?.trim();
    if (text) {
      try {
        urls.push(new URL(text).href);
      } catch {
        /* skip invalid */
      }
    }
  }
  if (!urls.length && rawXmlText) {
    return extractLocUrlsFromXmlText(rawXmlText);
  }
  return urls;
}

/**
 * @param {Element} parent
 * @param {string} localName
 * @returns {Element|null}
 */
function getSitemapChildElement(parent, localName) {
  let el = parent.getElementsByTagNameNS(SITEMAP_NS, localName)[0];
  if (!el) {
    const list = parent.getElementsByTagName(localName);
    el = list[0];
  }
  return el || null;
}

/**
 * Parses `<url><loc>…</loc><lastmod>…</lastmod></url>` entries; falls back to loc-only (no lastmod).
 * @param {Document} sitemapDoc
 * @param {string} [rawXmlText]
 * @returns {{ href: string, lastmod: string | null }[]}
 */
function extractSitemapUrlEntries(sitemapDoc, rawXmlText) {
  /** @type {{ href: string, lastmod: string | null }[]} */
  const entries = [];
  let urlEls = sitemapDoc.getElementsByTagNameNS(SITEMAP_NS, 'url');
  if (!urlEls.length) {
    urlEls = sitemapDoc.getElementsByTagName('url');
  }
  if (urlEls.length) {
    for (let i = 0; i < urlEls.length; i += 1) {
      const u = urlEls[i];
      const locEl = getSitemapChildElement(u, 'loc');
      const lmEl = getSitemapChildElement(u, 'lastmod');
      const text = locEl?.textContent?.trim();
      if (!text) continue;
      try {
        const href = new URL(text).href;
        const lastmod = lmEl?.textContent?.trim() || null;
        entries.push({ href, lastmod });
      } catch {
        /* skip */
      }
    }
    return entries;
  }
  const hrefs = extractSitemapLocUrls(sitemapDoc, rawXmlText);
  return hrefs.map((href) => ({ href, lastmod: null }));
}

/**
 * @param {Document} doc
 * @param {string} text
 * @returns {Promise<{ href: string, lastmod: string | null }[]>}
 */
async function resolveAllPageUrlsFromSitemap(doc, text) {
  const root = doc.documentElement;
  if (!root || root.localName !== 'sitemapindex') {
    return extractSitemapUrlEntries(doc, text);
  }
  const childSitemaps = extractLocUrlsFromXmlText(text);
  if (!childSitemaps.length) {
    return [];
  }
  const nested = await Promise.all(
    childSitemaps.map(async (smUrl) => {
      try {
        const r = await fetch(smUrl);
        if (!r.ok) return [];
        const t = await r.text();
        const d = new DOMParser().parseFromString(t, 'application/xml');
        if (d.querySelector('parsererror')) return [];
        return extractSitemapUrlEntries(d, t);
      } catch {
        return [];
      }
    }),
  );
  return nested.flat();
}

/**
 * @typedef {{ href: string, lastmod: string | null }} SitemapPageEntry
 */

/**
 * @typedef {Object<string, PathNode>} PathNode
 * @property {SitemapPageEntry[]} [PathNode._urls]
 */

/**
 * @param {PathNode} node
 * @param {string[]} segments
 * @param {SitemapPageEntry} entry
 */
function insertPathSegment(node, segments, entry) {
  if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
    if (!node._urls) node._urls = [];
    node._urls.push(entry);
    return;
  }
  const [head, ...rest] = segments;
  if (!node[head]) node[head] = {};
  insertPathSegment(node[head], rest, entry);
}

/**
 * Builds a single path tree from sitemap entries (pathname segments from site root).
 * @param {SitemapPageEntry[]} entries
 * @returns {PathNode}
 */
function buildPathTreeFromSitemapEntries(entries) {
  /** @type {PathNode} */
  const root = {};
  for (const entry of entries) {
    let pathname;
    try {
      pathname = new URL(entry.href).pathname;
    } catch {
      continue;
    }
    const suffix = pathname.replace(/^\/+/, '');
    const segments = suffix.split('/').filter((s) => s.length > 0);
    insertPathSegment(root, segments, entry);
  }
  return root;
}

const FILTER_DEBOUNCE_MS = 280;

/**
 * Precomputes lowercased strings once so each filter pass only runs substring checks (no URL parsing).
 * @param {SitemapPageEntry[]} entries
 */
function buildSitemapFilterIndex(entries) {
  const index = new Array(entries.length);
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    let pathLc = '';
    try {
      pathLc = new URL(entry.href).pathname.toLowerCase();
    } catch {
      /* ignore */
    }
    index[i] = {
      entry,
      hrefLc: entry.href.toLowerCase(),
      pathLc,
      lastmodLc: entry.lastmod ? entry.lastmod.toLowerCase() : '',
    };
  }
  return index;
}

/**
 * @param {ReturnType<typeof buildSitemapFilterIndex>} index
 * @param {string} rawQuery
 * @returns {SitemapPageEntry[]}
 */
function filterSitemapEntriesFromIndex(index, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    const out = new Array(index.length);
    for (let i = 0; i < index.length; i += 1) {
      out[i] = index[i].entry;
    }
    return out;
  }
  const out = [];
  for (let i = 0; i < index.length; i += 1) {
    const row = index[i];
    if (
      row.hrefLc.includes(q)
      || row.pathLc.includes(q)
      || (row.lastmodLc && row.lastmodLc.includes(q))
    ) {
      out.push(row.entry);
    }
  }
  return out;
}

/**
 * Total sitemap URLs under this tree node (this level’s `_urls` plus all descendant nodes).
 * @param {PathNode} node
 */
function countUrlsUnderNode(node) {
  let n = node._urls?.length ?? 0;
  for (const k of Object.keys(node)) {
    if (k === '_urls') continue;
    n += countUrlsUnderNode(node[k]);
  }
  return n;
}

/**
 * @param {string} iso lastmod value from sitemap
 */
function formatLastmodDisplay(iso) {
  if (!iso) return '';
  const d = Date.parse(iso);
  if (!Number.isNaN(d)) {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return iso;
}

/**
 * Appends `text` to `parent`, wrapping case-insensitive matches of `rawQuery` in `mark.admin-site-tree__highlight`.
 * @param {HTMLElement} parent
 * @param {string} text
 * @param {string} rawQuery
 */
function appendHighlightedText(parent, text, rawQuery) {
  const q = rawQuery.trim();
  if (!q || !text) {
    parent.append(document.createTextNode(text ?? ''));
    return;
  }
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let start = 0;
  let idx = lower.indexOf(needle, start);
  if (idx === -1) {
    parent.append(document.createTextNode(text));
    return;
  }
  while (idx !== -1) {
    if (idx > start) {
      parent.append(document.createTextNode(text.slice(start, idx)));
    }
    const mark = document.createElement('mark');
    mark.className = 'admin-site-tree__highlight';
    mark.textContent = text.slice(idx, idx + needle.length);
    parent.append(mark);
    start = idx + needle.length;
    idx = lower.indexOf(needle, start);
  }
  if (start < text.length) {
    parent.append(document.createTextNode(text.slice(start)));
  }
}

/**
 * @param {SitemapPageEntry[]} urlEntries
 * @param {string} highlightQuery same as filter query (substrings highlighted in URL / date labels)
 * @returns {HTMLElement}
 */
function buildUrlList(urlEntries, highlightQuery) {
  const hq = highlightQuery ?? '';
  if (urlEntries.length === 1) {
    const { href, lastmod } = urlEntries[0];
    const line = document.createElement('span');
    line.className = 'admin-site-tree__link-line';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'admin-site-tree__link admin-site-tree__link--solo';
    appendHighlightedText(a, href, hq);
    line.append(a);
    if (lastmod) {
      const t = document.createElement('time');
      t.className = 'admin-site-tree__lastmod';
      t.dateTime = lastmod;
      const shown = formatLastmodDisplay(lastmod);
      appendHighlightedText(t, shown, hq);
      t.title = `Last modified: ${lastmod}`;
      line.append(t);
    }
    return line;
  }
  const linkUl = document.createElement('ul');
  linkUl.className = 'admin-site-tree__urls';
  for (const { href, lastmod } of urlEntries) {
    const urlLi = document.createElement('li');
    urlLi.className = 'admin-site-tree__url-item';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'admin-site-tree__link';
    appendHighlightedText(a, href, hq);
    urlLi.append(a);
    if (lastmod) {
      const t = document.createElement('time');
      t.className = 'admin-site-tree__lastmod';
      t.dateTime = lastmod;
      const shown = formatLastmodDisplay(lastmod);
      appendHighlightedText(t, shown, hq);
      t.title = `Last modified: ${lastmod}`;
      urlLi.append(t);
    }
    linkUl.append(urlLi);
  }
  return linkUl;
}

/**
 * @param {PathNode} node
 * @param {HTMLUListElement} ul
 * @param {string} parentPath path above this node (`''` at site root)
 * @param {Set<string>} crossRefSet normalized pathPrefixes present in devsitepaths and sitemap
 * @param {Map<string, object>} devsiteLookup normalized pathPrefix → row
 * @param {string} highlightQuery filter text for <mark> highlights
 * @param {HTMLElement} treeMount
 */
function renderPathNodeToList(node, ul, parentPath, crossRefSet, devsiteLookup, highlightQuery, treeMount) {
  const hq = highlightQuery ?? '';
  const childKeys = Object.keys(node).filter((k) => k !== '_urls').sort((a, b) => a.localeCompare(b));

  if (node._urls?.length) {
    const li = document.createElement('li');
    li.className = 'admin-site-tree__urls-row';
    const pathForRow = normalizePathForMatch(parentPath || '/');
    const fragId = treeFragmentIdFromPath(pathForRow);
    li.id = fragId;
    const perm = document.createElement('a');
    perm.className = 'admin-site-tree__path-anchor admin-site-tree__row-permalink';
    perm.textContent = '#';
    perm.setAttribute('aria-label', `Permalink to path ${pathForRow}`);
    bindTreePermalinkAnchor(perm, fragId, treeMount);

    const n = node._urls.length;
    const links = buildUrlList(node._urls, hq);
    if (n > 1) {
      const header = document.createElement('div');
      header.className = 'admin-site-tree__urls-header';
      const countEl = document.createElement('span');
      countEl.className = 'admin-site-tree__count';
      countEl.textContent = `${n} URLs at this path`;
      header.append(countEl);
      if (crossRefSet.has(pathForRow) && devsiteLookup.has(pathForRow)) {
        appendDevsitepathsMatchNote(header, devsiteLookup.get(pathForRow));
      }
      li.append(perm, header, links);
    } else {
      li.append(perm, links);
    }
    ul.append(li);
  }

  for (const key of childKeys) {
    const li = document.createElement('li');
    const child = node[key];
    const subKeys = Object.keys(child).filter((k) => k !== '_urls');
    const hasSubtree = subKeys.length > 0;
    const fullPath = segmentPath(parentPath, key);
    const normPath = normalizePathForMatch(fullPath);
    const fragId = treeFragmentIdFromPath(fullPath);
    li.id = fragId;
    const devsiteRow = devsiteLookup.get(normPath);
    const showDevsiteNote = crossRefSet.has(normPath) && devsiteRow;

    if (hasSubtree) {
      const details = document.createElement('details');
      details.className = 'admin-site-tree__node';
      const summary = document.createElement('summary');
      summary.className = 'admin-site-tree__segment';
      const label = document.createElement('span');
      label.className = 'admin-site-tree__segment-label';
      const labelA = document.createElement('a');
      labelA.className = 'admin-site-tree__path-anchor';
      bindTreePermalinkAnchor(labelA, fragId, treeMount);
      appendHighlightedText(labelA, key, hq);
      label.append(labelA);
      summary.append(label);
      if (showDevsiteNote) {
        appendDevsitepathsMatchNote(summary, devsiteRow);
      }
      const countEl = document.createElement('span');
      countEl.className = 'admin-site-tree__count';
      const under = countUrlsUnderNode(child);
      countEl.textContent = `${under} URL${under === 1 ? '' : 's'}`;
      summary.append(countEl);
      details.append(summary);
      const nestedUl = document.createElement('ul');
      nestedUl.className = 'admin-site-tree__branch';
      renderPathNodeToList(child, nestedUl, fullPath, crossRefSet, devsiteLookup, hq, treeMount);
      details.append(nestedUl);
      li.append(details);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'admin-site-tree__leaf';
      const row = document.createElement('div');
      row.className = 'admin-site-tree__leaf-row';
      const segWrap = document.createElement('span');
      segWrap.className = 'admin-site-tree__segment-wrap';
      const segA = document.createElement('a');
      segA.className = 'admin-site-tree__path-anchor admin-site-tree__segment admin-site-tree__segment--leaf';
      bindTreePermalinkAnchor(segA, fragId, treeMount);
      appendHighlightedText(segA, key, hq);
      segWrap.append(segA);
      row.append(segWrap);
      if (showDevsiteNote) {
        appendDevsitepathsMatchNote(row, devsiteRow);
      }
      const underLeaf = countUrlsUnderNode(child);
      if (underLeaf > 1) {
        const countEl = document.createElement('span');
        countEl.className = 'admin-site-tree__count';
        countEl.textContent = `${underLeaf} URLs`;
        row.append(countEl);
      } else if (underLeaf === 1) {
        row.append(document.createTextNode(':'));
      }
      wrap.append(row);
      if (child._urls?.length) {
        wrap.append(buildUrlList(child._urls, hq));
      }
      li.append(wrap);
    }
    ul.append(li);
  }
}

/**
 * @param {PathNode} root
 * @param {Set<string>} crossRefSet
 * @param {Map<string, object>} devsiteLookup
 * @param {string} highlightQuery
 * @param {HTMLElement} treeMount
 * @returns {HTMLUListElement}
 */
function renderPathTree(root, crossRefSet, devsiteLookup, highlightQuery, treeMount) {
  const ul = document.createElement('ul');
  ul.className = 'admin-site-tree__branch admin-site-tree__branch--root';
  renderPathNodeToList(root, ul, '', crossRefSet, devsiteLookup, highlightQuery, treeMount);
  return ul;
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('block', 'admin');

  const [devsitePathsJson, sitemapResult] = await Promise.all([
    getdevsitePathFile(),
    loadSitemapForAdmin(),
  ]);

  const devsiteNote = devsitePathsJson?.data?.length
    ? `${devsitePathsJson.data.length} devsitepaths row(s) loaded.`
    : 'devsitepaths.json not available.';

  if (!sitemapResult) {
    const p = document.createElement('p');
    p.className = 'admin-site-tree__empty';
    p.textContent = 'Could not load or parse sitemap.xml.';
    block.append(p);
    return;
  }

  const { bundle, baseUrl } = sitemapResult;
  const entries = await resolveAllPageUrlsFromSitemap(bundle.document, bundle.text);
  const urls = entries.map((e) => e.href);
  const { crossRefSet, lookup: devsiteLookup } = buildCrossReferencedDevsitePaths(
    devsitePathsJson?.data,
    urls,
  );

  const heading = document.createElement('h2');
  heading.className = 'admin-site-tree__heading';
  heading.textContent = 'Sitemap';

  const meta = document.createElement('p');
  meta.className = 'admin-site-tree__intro';
  meta.textContent = `${devsiteNote} Showing ${urls.length} URL(s) from ${baseUrl}/sitemap.xml as a path tree.`;

  const panel = document.createElement('div');
  panel.className = 'admin-site-tree';

  const filterRow = document.createElement('div');
  filterRow.className = 'admin-site-tree__filter-row';
  const filterLabel = document.createElement('label');
  filterLabel.className = 'admin-site-tree__filter-label';
  const filterLabelText = document.createElement('span');
  filterLabelText.className = 'admin-site-tree__filter-label-text';
  filterLabelText.textContent = 'Filter';
  const filterInput = document.createElement('input');
  filterInput.type = 'search';
  filterInput.className = 'admin-site-tree__filter-input';
  filterInput.placeholder = 'Filter by URL, path, or last modified…';
  filterInput.setAttribute('autocomplete', 'off');
  filterLabel.append(filterLabelText, filterInput);
  const filterMeta = document.createElement('p');
  filterMeta.className = 'admin-site-tree__filter-meta';
  filterMeta.setAttribute('aria-live', 'polite');
  filterRow.append(filterLabel);

  const treeMount = document.createElement('div');
  treeMount.className = 'admin-site-tree__tree-mount';

  const filterIndex = buildSitemapFilterIndex(entries);
  let filterDebounceId = null;
  let filterRafId = 0;

  /**
   * After expanding filtered folders, outline the last `li` in tree order (deepest / bottom row).
   * @param {HTMLElement} container
   */
  function highlightLastExpandedListItem(container) {
    const lis = container.querySelectorAll('li');
    if (!lis.length) return;
    lis[lis.length - 1].classList.add('admin-site-tree__li--last-expanded');
  }

  function renderTreeForEntries(list, highlightQuery) {
    treeMount.replaceChildren();
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-site-tree__filter-empty';
      empty.textContent = 'No pages match this filter.';
      treeMount.append(empty);
      return;
    }
    const tree = buildPathTreeFromSitemapEntries(list);
    treeMount.append(renderPathTree(tree, crossRefSet, devsiteLookup, highlightQuery, treeMount));
    const q = (highlightQuery || '').trim();
    if (q) {
      treeMount.querySelectorAll('details.admin-site-tree__node').forEach((d) => {
        d.open = true;
      });
      highlightLastExpandedListItem(treeMount);
    }
    syncHashToTree(treeMount);
  }

  function applyFilterFromInput() {
    const q = filterInput.value;
    const filtered = filterSitemapEntriesFromIndex(filterIndex, q);
    const metaText = q.trim()
      ? `Showing ${filtered.length} of ${entries.length} page(s) matching “${q.trim()}”.`
      : '';
    cancelAnimationFrame(filterRafId);
    filterRafId = requestAnimationFrame(() => {
      filterRafId = 0;
      renderTreeForEntries(filtered, q);
      filterMeta.textContent = metaText;
    });
  }

  filterInput.addEventListener('input', () => {
    clearTimeout(filterDebounceId);
    filterDebounceId = setTimeout(() => {
      filterDebounceId = null;
      applyFilterFromInput();
    }, FILTER_DEBOUNCE_MS);
  });

  const onHashChange = () => syncHashToTree(treeMount);
  window.addEventListener('hashchange', onHashChange);

  renderTreeForEntries(entries, '');

  panel.append(filterRow, filterMeta, treeMount);
  block.append(heading, meta, panel);
}
