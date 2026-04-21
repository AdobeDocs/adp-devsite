
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
  const note = document.createElement('span');
  note.className = 'admin-site-tree__devsitepaths-match';
  note.textContent = 'devsitepaths';
  const repo = row.repo ? `${row.owner}/${row.repo}` : '';
  note.title = repo
    ? `Matches devsitepaths.json: ${repo} · pathPrefix ${row.pathPrefix}`
    : `Matches devsitepaths.json · pathPrefix ${row.pathPrefix}`;
  parent.append(note);
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
 * @param {Document} doc
 * @param {string} text
 * @returns {Promise<string[]>}
 */
async function resolveAllPageUrlsFromSitemap(doc, text) {
  const root = doc.documentElement;
  if (!root || root.localName !== 'sitemapindex') {
    return extractSitemapLocUrls(doc, text);
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
        return extractSitemapLocUrls(d, t);
      } catch {
        return [];
      }
    }),
  );
  return nested.flat();
}

/**
 * @typedef {Object<string, PathNode>} PathNode
 * @property {string[]} [PathNode._urls]
 */

/**
 * @param {PathNode} node
 * @param {string[]} segments
 * @param {string} fullUrl
 */
function insertPathSegment(node, segments, fullUrl) {
  if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
    if (!node._urls) node._urls = [];
    node._urls.push(fullUrl);
    return;
  }
  const [head, ...rest] = segments;
  if (!node[head]) node[head] = {};
  insertPathSegment(node[head], rest, fullUrl);
}

/**
 * Builds a single path tree from sitemap URLs (pathname segments from site root).
 * @param {string[]} urls
 * @returns {PathNode}
 */
function buildPathTreeFromSitemapUrls(urls) {
  /** @type {PathNode} */
  const root = {};
  for (const href of urls) {
    let pathname;
    try {
      pathname = new URL(href).pathname;
    } catch {
      continue;
    }
    const suffix = pathname.replace(/^\/+/, '');
    const segments = suffix.split('/').filter((s) => s.length > 0);
    insertPathSegment(root, segments, href);
  }
  return root;
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
 * @param {string[]} urlList
 * @returns {HTMLElement} A `<ul>` of links, or a single `<a>` when there is exactly one URL.
 */
function buildUrlList(urlList) {
  if (urlList.length === 1) {
    const url = urlList[0];
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.className = 'admin-site-tree__link admin-site-tree__link--solo';
    return a;
  }
  const linkUl = document.createElement('ul');
  linkUl.className = 'admin-site-tree__urls';
  for (const url of urlList) {
    const urlLi = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.className = 'admin-site-tree__link';
    urlLi.append(a);
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
 */
function renderPathNodeToList(node, ul, parentPath, crossRefSet, devsiteLookup) {
  const childKeys = Object.keys(node).filter((k) => k !== '_urls').sort((a, b) => a.localeCompare(b));

  if (node._urls?.length) {
    const li = document.createElement('li');
    li.className = 'admin-site-tree__urls-row';
    const n = node._urls.length;
    const links = buildUrlList(node._urls);
    if (n > 1) {
      const header = document.createElement('div');
      header.className = 'admin-site-tree__urls-header';
      const countEl = document.createElement('span');
      countEl.className = 'admin-site-tree__count';
      countEl.textContent = `${n} URLs at this path`;
      header.append(countEl);
      const pathHere = normalizePathForMatch(parentPath || '/');
      if (crossRefSet.has(pathHere) && devsiteLookup.has(pathHere)) {
        appendDevsitepathsMatchNote(header, devsiteLookup.get(pathHere));
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
      label.textContent = key;
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
      renderPathNodeToList(child, nestedUl, fullPath, crossRefSet, devsiteLookup);
      details.append(nestedUl);
      li.append(details);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'admin-site-tree__leaf';
      const row = document.createElement('div');
      row.className = 'admin-site-tree__leaf-row';
      const span = document.createElement('span');
      span.className = 'admin-site-tree__segment admin-site-tree__segment--leaf';
      span.textContent = key;
      row.append(span);
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
        wrap.append(buildUrlList(child._urls));
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
 * @returns {HTMLUListElement}
 */
function renderPathTree(root, crossRefSet, devsiteLookup) {
  const ul = document.createElement('ul');
  ul.className = 'admin-site-tree__branch admin-site-tree__branch--root';
  renderPathNodeToList(root, ul, '', crossRefSet, devsiteLookup);
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
  const urls = await resolveAllPageUrlsFromSitemap(bundle.document, bundle.text);
  const pathTree = buildPathTreeFromSitemapUrls(urls);
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
  panel.append(renderPathTree(pathTree, crossRefSet, devsiteLookup));

  block.append(heading, meta, panel);
}
