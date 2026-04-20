
import { getdevsitePathFile, fetchSitemapXml } from '../../scripts/lib-adobeio.js';

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/**
 * On HLX/AEM preview hosts, `origin/sitemap.xml` is not the full public Developer catalog.
 * Use the matching public site so pathPrefix grouping matches devsitepaths.
 */
function getPreferredSitemapBaseUrl() {
  const h = window.location.hostname;
  if (h.endsWith('.aem.page') || h.endsWith('.hlx.page')) {
    if (/stage/i.test(h)) {
      return 'https://developer-stage.adobe.com';
    }
    return 'https://www.developer.adobe.com';
  }
  return window.location.origin;
}

/**
 * @returns {Promise<{ bundle: { document: Document, text: string }, baseUrl: string }|null>}
 */
async function loadSitemapForAdmin() {
  const preferred = getPreferredSitemapBaseUrl();
  let bundle = null;
  try {
    bundle = await fetchSitemapXml(preferred);
  } catch {
    bundle = null;
  }
  let baseUrl = preferred;
  if (!bundle && preferred !== window.location.origin) {
    try {
      bundle = await fetchSitemapXml(window.location.origin);
    } catch {
      bundle = null;
    }
    baseUrl = window.location.origin;
  }
  if (!bundle) {
    return null;
  }
  return { bundle, baseUrl };
}

/**
 * @param {string} pathPrefix devsitepaths `pathPrefix` value
 * @returns {string} Leading slash, no trailing slash (except root `/`)
 */
function canonicalPrefixPath(pathPrefix) {
  if (pathPrefix === '/') return '/';
  let p = String(pathPrefix).trim();
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
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
 * @param {string} [rawXmlText] fallback when DOM lookups return no loc elements
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
 * Flat urlset: collect page URLs from the document. Sitemap index: fetch each child sitemap and merge page URLs.
 * @param {Document} doc
 * @param {string} text raw XML of the root sitemap response
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
 * @param {string} pathname
 * @param {{ pathPrefix: string }[]} rows
 * @returns {{ pathPrefix: string } | null}
 */
function findBestMatchingPathRow(pathname, rows) {
  let best = null;
  let bestLen = -1;
  for (const row of rows) {
    if (row.pathPrefix === '/') continue;
    const np = canonicalPrefixPath(row.pathPrefix);
    if (np === '/') continue;
    if (pathname === np || pathname === `${np}/` || pathname.startsWith(`${np}/`)) {
      if (np.length > bestLen) {
        bestLen = np.length;
        best = row;
      }
    }
  }
  if (best) return best;
  return rows.find((r) => r.pathPrefix === '/') || null;
}

/**
 * Deduplicate by pathPrefix (first row wins).
 * @param {object[]} data
 */
function dedupePathPrefixRows(data) {
  const seen = new Map();
  for (const row of data) {
    if (row && typeof row.pathPrefix === 'string' && !seen.has(row.pathPrefix)) {
      seen.set(row.pathPrefix, row);
    }
  }
  return [...seen.values()];
}

/**
 * @param {string} pathname
 * @param {string} pathPrefix
 */
function suffixAfterPrefix(pathname, pathPrefix) {
  if (pathPrefix === '/') {
    return pathname.replace(/^\/+/, '');
  }
  const np = canonicalPrefixPath(pathPrefix);
  if (np === '/') {
    return pathname.replace(/^\/+/, '');
  }
  if (pathname === np || pathname === `${np}/`) {
    return '';
  }
  if (pathname.startsWith(`${np}/`)) {
    return pathname.slice(np.length + 1);
  }
  return '';
}

/**
 * @typedef {Object<string, TreeNode>} TreeNode
 * @property {string[]} [TreeNode._urls]
 */

/**
 * @param {TreeNode} node
 * @param {string[]} segments
 * @param {string} fullUrl
 */
function insertUrlIntoTree(node, segments, fullUrl) {
  if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
    if (!node._urls) node._urls = [];
    node._urls.push(fullUrl);
    return;
  }
  const [head, ...rest] = segments;
  if (!node[head]) node[head] = {};
  insertUrlIntoTree(node[head], rest, fullUrl);
}

/**
 * @param {string[]} urls
 * @param {string} pathPrefix
 * @returns {TreeNode}
 */
function buildSegmentTreeForPrefix(urls, pathPrefix) {
  /** @type {TreeNode} */
  const root = {};
  for (const href of urls) {
    let pathname;
    try {
      pathname = new URL(href).pathname;
    } catch {
      continue;
    }
    const suffix = suffixAfterPrefix(pathname, pathPrefix);
    const segments = suffix.split('/').filter((s) => s.length > 0);
    insertUrlIntoTree(root, segments, href);
  }
  return root;
}

/**
 * @param {string[]} urlList
 * @returns {HTMLUListElement}
 */
function buildUrlList(urlList) {
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
 * @param {TreeNode} node
 * @param {HTMLUListElement} ul
 */
function renderTreeNodeToList(node, ul) {
  const childKeys = Object.keys(node).filter((k) => k !== '_urls').sort((a, b) => a.localeCompare(b));

  if (node._urls?.length) {
    const li = document.createElement('li');
    li.className = 'admin-site-tree__urls-row';
    li.append(buildUrlList(node._urls));
    ul.append(li);
  }

  for (const key of childKeys) {
    const li = document.createElement('li');
    const child = node[key];
    const subKeys = Object.keys(child).filter((k) => k !== '_urls');
    const hasSubtree = subKeys.length > 0;

    if (hasSubtree) {
      const details = document.createElement('details');
      details.className = 'admin-site-tree__node';
      const summary = document.createElement('summary');
      summary.className = 'admin-site-tree__segment';
      summary.textContent = key;
      details.append(summary);
      const nestedUl = document.createElement('ul');
      nestedUl.className = 'admin-site-tree__branch';
      renderTreeNodeToList(child, nestedUl);
      details.append(nestedUl);
      li.append(details);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'admin-site-tree__leaf';
      const span = document.createElement('span');
      span.className = 'admin-site-tree__segment admin-site-tree__segment--leaf';
      span.textContent = key;
      wrap.append(span);
      if (child._urls?.length) {
        wrap.append(buildUrlList(child._urls));
      }
      li.append(wrap);
    }
    ul.append(li);
  }
}

/**
 * @param {TreeNode} root
 * @returns {HTMLUListElement}
 */
function renderFullTree(root) {
  const ul = document.createElement('ul');
  ul.className = 'admin-site-tree__branch admin-site-tree__branch--root';
  renderTreeNodeToList(root, ul);
  return ul;
}

/**
 * @param {Map<string, { row: object, urls: string[] }>} groups
 * @returns {HTMLElement}
 */
function buildSiteTreeUi(groups) {
  const wrapper = document.createElement('div');
  wrapper.className = 'admin-site-tree';

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === '/') return 1;
    if (b === '/') return -1;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    const { row, urls } = groups.get(key);
    const details = document.createElement('details');
    details.className = 'admin-site-tree__section';
    details.open = false;

    const summary = document.createElement('summary');
    summary.className = 'admin-site-tree__summary';

    const title = document.createElement('span');
    title.className = 'admin-site-tree__title';
    title.textContent = row.pathPrefix || '/';

    const badge = document.createElement('span');
    badge.className = 'admin-site-tree__badge';
    badge.textContent = row.repo ? `${row.owner}/${row.repo}` : '';

    const count = document.createElement('span');
    count.className = 'admin-site-tree__count';
    count.textContent = `${urls.length} URL${urls.length === 1 ? '' : 's'}`;

    summary.append(title);
    if (badge.textContent) summary.append(badge);
    summary.append(count);

    details.append(summary);

    const treeRoot = buildSegmentTreeForPrefix(urls, row.pathPrefix);
    const treeEl = renderFullTree(treeRoot);
    details.append(treeEl);

    wrapper.append(details);
  }

  return wrapper;
}

/**
 * @param {string[]} urls
 * @param {object[]} pathRows
 * @returns {Map<string, { row: object, urls: string[] }>}
 */
function groupUrlsByPathPrefix(urls, pathRows) {
  /** @type {Map<string, { row: object, urls: string[] }>} */
  const groups = new Map();
  for (const row of pathRows) {
    groups.set(row.pathPrefix, { row, urls: [] });
  }

  for (const href of urls) {
    let pathname;
    try {
      pathname = new URL(href).pathname;
    } catch {
      continue;
    }
    const match = findBestMatchingPathRow(pathname, pathRows);
    if (!match) continue;
    const entry = groups.get(match.pathPrefix);
    if (entry) entry.urls.push(href);
  }

  return groups;
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('block', 'admin');

  const devsitePathsJson = await getdevsitePathFile();
  const sitemapXml = await fetchSitemapXml();

  if (!devsitePathsJson?.data?.length) {
    const p = document.createElement('p');
    p.className = 'admin-site-tree__empty';
    p.textContent = 'Could not load devsitepaths.json or it has no path entries.';
    block.append(p);
    return;
  }

  if (!sitemapXml) {
    const p = document.createElement('p');
    p.className = 'admin-site-tree__empty';
    p.textContent = 'Could not load or parse sitemap.xml.';
    block.append(p);
    return;
  }

  const pathRows = dedupePathPrefixRows(devsitePathsJson.data);
  const urls = await resolveAllPageUrlsFromSitemap(sitemapXml.document, sitemapXml.text);
  const groups = groupUrlsByPathPrefix(urls, pathRows);

  const heading = document.createElement('h2');
  heading.className = 'admin-site-tree__heading';
  heading.textContent = 'Site tree';

  const meta = document.createElement('p');
  meta.className = 'admin-site-tree__intro';
  meta.textContent = `Grouped by pathPrefix (${pathRows.length} roots, ${urls.length} sitemap URLs).`;

  block.append(heading, meta, buildSiteTreeUi(groups));
}
