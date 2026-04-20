
import { getdevsitePathFile, fetchSitemapXml, getSitemapFetchOrigin } from '../../scripts/lib-adobeio.js';

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

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
 * @param {PathNode} node
 * @param {HTMLUListElement} ul
 */
function renderPathNodeToList(node, ul) {
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
      renderPathNodeToList(child, nestedUl);
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
 * @param {PathNode} root
 * @returns {HTMLUListElement}
 */
function renderPathTree(root) {
  const ul = document.createElement('ul');
  ul.className = 'admin-site-tree__branch admin-site-tree__branch--root';
  renderPathNodeToList(root, ul);
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

  const heading = document.createElement('h2');
  heading.className = 'admin-site-tree__heading';
  heading.textContent = 'Sitemap';

  const meta = document.createElement('p');
  meta.className = 'admin-site-tree__intro';
  meta.textContent = `${devsiteNote} Showing ${urls.length} URL(s) from ${baseUrl}/sitemap.xml as a path tree.`;

  const panel = document.createElement('div');
  panel.className = 'admin-site-tree';
  panel.append(renderPathTree(pathTree));

  block.append(heading, meta, panel);
}
