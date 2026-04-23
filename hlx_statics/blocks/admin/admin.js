
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
 * @param {{ href: string }[]} entries
 * @returns {Set<string>}
 */
function buildSitemapPathnameSet(entries) {
  const set = new Set();
  for (const { href } of entries) {
    try {
      set.add(normalizePathForMatch(new URL(href).pathname));
    } catch {
      /* skip */
    }
  }
  return set;
}

/**
 * True if another sitemap pathname lives strictly under this path (treat URL as folder → `index.md`).
 * @param {string} pathnameNorm
 * @param {Set<string>} sitemapPathnames
 */
function pathnameIsSitemapFolderUrl(pathnameNorm, sitemapPathnames) {
  for (const p of sitemapPathnames) {
    if (p === pathnameNorm) continue;
    if (pathnameNorm === '/') {
      if (p.length > 1 && p.startsWith('/')) return true;
      continue;
    }
    if (p.startsWith(`${pathnameNorm}/`)) return true;
  }
  return false;
}

/**
 * Longest devsitepaths `pathPrefix` in `crossRefSet` that matches this page pathname (parent + all children).
 * @param {string} pageHref
 * @param {Map<string, object>} devsiteLookup
 * @param {Set<string>} crossRefSet
 * @returns {{ row: object, prefix: string }|null}
 */
function findDevsiteCrossRefForPageHref(pageHref, devsiteLookup, crossRefSet) {
  let pathname;
  try {
    pathname = normalizePathForMatch(new URL(pageHref).pathname);
  } catch {
    return null;
  }
  let bestPrefix = '';
  let bestRow = null;
  for (const prefixRaw of crossRefSet) {
    const prefix = normalizePathForMatch(prefixRaw);
    if (!(pathname === prefix || pathname.startsWith(`${prefix}/`))) continue;
    if (prefix.length <= bestPrefix.length) continue;
    const row = devsiteLookup.get(prefix);
    if (!row) continue;
    bestPrefix = prefix;
    bestRow = row;
  }
  return bestRow && bestPrefix ? { row: bestRow, prefix: bestPrefix } : null;
}

/**
 * GitHub blob URL for the markdown under `src/pages/` (pathPrefix from JSON maps to that folder).
 * Leaf pages: `…/segment.md`. Folder URLs (another sitemap path below this one): `…/segment/index.md`.
 * Section root (pathname equals pathPrefix): `index.md`.
 * @param {object} row devsitepaths row (`owner`, `repo`)
 * @param {string} pageHref
 * @param {string} matchedPrefixNorm normalized pathPrefix that matched (longest)
 * @param {Set<string>} sitemapPathnames pathnames in the currently rendered sitemap slice
 * @returns {string|null}
 */
function githubBlobSrcPageMdUrl(row, pageHref, matchedPrefixNorm, sitemapPathnames) {
  const owner = typeof row.owner === 'string' ? row.owner.trim() : '';
  const repoName = typeof row.repo === 'string' ? row.repo.trim() : '';
  if (!owner || !repoName) return null;
  let pathname;
  try {
    pathname = normalizePathForMatch(new URL(pageHref).pathname);
  } catch {
    return null;
  }
  const prefix = normalizePathForMatch(matchedPrefixNorm);
  if (!(pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }
  const rest = pathname === prefix ? '' : pathname.slice(prefix.length).replace(/^\/+/, '');
  const rel = rest.split('/').filter(Boolean).join('/');
  const enc = (pathStr) => pathStr.split('/').filter(Boolean).map((seg) => encodeURIComponent(seg)).join('/');
  let mdPath;
  if (!rel) {
    mdPath = 'index.md';
  } else if (pathnameIsSitemapFolderUrl(pathname, sitemapPathnames)) {
    mdPath = `${enc(rel)}/index.md`;
  } else {
    mdPath = `${enc(rel)}.md`;
  }
  return `https://github.com/${owner}/${repoName}/blob/main/src/pages/${mdPath}`;
}

/**
 * GitHub icon linking to the blob for this page’s `src/pages/…md` (any URL under a cross-matched pathPrefix).
 * @param {string} pageHref
 * @param {Map<string, object>} devsiteLookup
 * @param {Set<string>} crossRefSet
 * @param {Set<string>} sitemapPathnames
 * @returns {HTMLAnchorElement|null}
 */
function createGithubSrcPagesGearLink(pageHref, devsiteLookup, crossRefSet, sitemapPathnames) {
  const hit = findDevsiteCrossRefForPageHref(pageHref, devsiteLookup, crossRefSet);
  if (!hit) return null;
  const url = githubBlobSrcPageMdUrl(hit.row, pageHref, hit.prefix, sitemapPathnames);
  if (!url) return null;
  const a = document.createElement('a');
  a.href = url;
  a.className = 'admin-site-tree__github-gear';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = url;
  a.setAttribute('aria-label', 'View this page’s markdown on GitHub');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  const mark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  mark.setAttribute('fill-rule', 'evenodd');
  mark.setAttribute('clip-rule', 'evenodd');
  mark.setAttribute(
    'd',
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  );
  svg.append(mark);
  a.append(svg);
  return a;
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

/** @returns {Promise<void>} */
function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/**
 * @param {HTMLElement} block
 * @returns {HTMLDivElement}
 */
function appendAdminLoadingState(block) {
  const wrap = document.createElement('div');
  wrap.className = 'admin__loading';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');
  wrap.setAttribute('aria-busy', 'true');
  const spinner = document.createElement('span');
  spinner.className = 'admin__loading-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'admin__loading-text';
  label.textContent = 'Loading devsitepaths and sitemap…';
  wrap.append(spinner, label);
  block.append(wrap);
  return wrap;
}

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
 * @param {Map<string, object>} devsiteLookup normalized pathPrefix → devsitepaths row
 * @param {Set<string>} crossRefSet pathPrefixes that appear in devsitepaths and sitemap
 * @param {Set<string>} sitemapPathnames normalized pathnames in the current tree’s entry list
 * @returns {HTMLElement}
 */
function buildUrlList(urlEntries, highlightQuery, devsiteLookup, crossRefSet, sitemapPathnames) {
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
    const gear = createGithubSrcPagesGearLink(href, devsiteLookup, crossRefSet, sitemapPathnames);
    if (lastmod) {
      const t = document.createElement('time');
      t.className = 'admin-site-tree__lastmod';
      t.dateTime = lastmod;
      const shown = formatLastmodDisplay(lastmod);
      appendHighlightedText(t, shown, hq);
      t.title = `Last modified: ${lastmod}`;
      if (gear) {
        const meta = document.createElement('span');
        meta.className = 'admin-site-tree__url-meta';
        meta.append(t, gear);
        line.append(meta);
      } else {
        line.append(t);
      }
    } else if (gear) {
      line.append(gear);
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
    const gear = createGithubSrcPagesGearLink(href, devsiteLookup, crossRefSet, sitemapPathnames);
    if (lastmod) {
      const t = document.createElement('time');
      t.className = 'admin-site-tree__lastmod';
      t.dateTime = lastmod;
      const shown = formatLastmodDisplay(lastmod);
      appendHighlightedText(t, shown, hq);
      t.title = `Last modified: ${lastmod}`;
      if (gear) {
        const meta = document.createElement('span');
        meta.className = 'admin-site-tree__url-meta';
        meta.append(t, gear);
        urlLi.append(meta);
      } else {
        urlLi.append(t);
      }
    } else if (gear) {
      urlLi.append(gear);
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
 * @param {Set<string>} sitemapPathnames
 */
function renderPathNodeToList(node, ul, parentPath, crossRefSet, devsiteLookup, highlightQuery, sitemapPathnames) {
  const hq = highlightQuery ?? '';
  const childKeys = Object.keys(node).filter((k) => k !== '_urls').sort((a, b) => a.localeCompare(b));

  if (node._urls?.length) {
    const li = document.createElement('li');
    li.className = 'admin-site-tree__urls-row';
    const pathForRow = normalizePathForMatch(parentPath || '/');

    const n = node._urls.length;
    const links = buildUrlList(node._urls, hq, devsiteLookup, crossRefSet, sitemapPathnames);
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
      li.append(header, links);
    } else {
      li.append(links);
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
    const devsiteRow = devsiteLookup.get(normPath);
    const showDevsiteNote = crossRefSet.has(normPath) && devsiteRow;

    if (hasSubtree) {
      const details = document.createElement('details');
      details.className = 'admin-site-tree__node';
      const summary = document.createElement('summary');
      summary.className = 'admin-site-tree__segment';
      const label = document.createElement('span');
      label.className = 'admin-site-tree__segment-label';
      appendHighlightedText(label, key, hq);
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
      renderPathNodeToList(child, nestedUl, fullPath, crossRefSet, devsiteLookup, hq, sitemapPathnames);
      details.append(nestedUl);
      li.append(details);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'admin-site-tree__leaf';
      const row = document.createElement('div');
      row.className = 'admin-site-tree__leaf-row';
      const segWrap = document.createElement('span');
      segWrap.className = 'admin-site-tree__segment-wrap';
      const segLabel = document.createElement('span');
      segLabel.className = 'admin-site-tree__segment admin-site-tree__segment--leaf';
      appendHighlightedText(segLabel, key, hq);
      segWrap.append(segLabel);
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
        wrap.append(buildUrlList(child._urls, hq, devsiteLookup, crossRefSet, sitemapPathnames));
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
 * @param {Set<string>} sitemapPathnames
 * @returns {HTMLUListElement}
 */
function renderPathTree(root, crossRefSet, devsiteLookup, highlightQuery, sitemapPathnames) {
  const ul = document.createElement('ul');
  ul.className = 'admin-site-tree__branch admin-site-tree__branch--root';
  renderPathNodeToList(root, ul, '', crossRefSet, devsiteLookup, highlightQuery, sitemapPathnames);
  return ul;
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('block', 'admin');

  const loadingWrap = appendAdminLoadingState(block);

  try {
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
      const sitemapPathnames = buildSitemapPathnameSet(list);
      treeMount.append(renderPathTree(tree, crossRefSet, devsiteLookup, highlightQuery, sitemapPathnames));
      const q = (highlightQuery || '').trim();
      if (q) {
        treeMount.querySelectorAll('details.admin-site-tree__node').forEach((d) => {
          d.open = true;
        });
        highlightLastExpandedListItem(treeMount);
      }
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

    renderTreeForEntries(entries, '');

    panel.append(filterRow, filterMeta, treeMount);
    block.append(heading, meta, panel);
    await waitForNextPaint();
  } catch {
    const p = document.createElement('p');
    p.className = 'admin-site-tree__empty';
    p.textContent = 'Could not load admin content.';
    block.append(p);
  } finally {
    loadingWrap.remove();
  }
}
