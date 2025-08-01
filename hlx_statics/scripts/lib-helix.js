/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { loadFragment } from '../blocks/fragment/fragment.js';

/**
 * log RUM if part of the sample.
 * @param {string} checkpoint identifies the checkpoint in funnel
 * @param {Object} data additional data for RUM sample
 */

export function sampleRUM(checkpoint, data = {}) {
  sampleRUM.defer = sampleRUM.defer || [];
  const defer = (fnname) => {
    sampleRUM[fnname] = sampleRUM[fnname]
      || ((...args) => sampleRUM.defer.push({ fnname, args }));
  };
  sampleRUM.drain = sampleRUM.drain
    || ((dfnname, fn) => {
      sampleRUM[dfnname] = fn;
      sampleRUM.defer
        .filter(({ fnname }) => dfnname === fnname)
        .forEach(({ fnname, args }) => sampleRUM[fnname](...args));
    });
  sampleRUM.on = (chkpnt, fn) => { sampleRUM.cases[chkpnt] = fn; };
  defer('observe');
  defer('cwv');
  try {
    window.hlx = window.hlx || {};
    if (!window.hlx.rum) {
      const usp = new URLSearchParams(window.location.search);
      const weight = (usp.get('rum') === 'on') ? 1 : 100; // with parameter, weight is 1. Defaults to 100.
      // eslint-disable-next-line no-bitwise
      const hashCode = (s) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
      const id = `${hashCode(window.location.href)}-${new Date().getTime()}-${Math.random().toString(16).substr(2, 14)}`;
      const random = Math.random();
      const isSelected = (random * weight < 1);
      // eslint-disable-next-line object-curly-newline
      window.hlx.rum = { weight, id, random, isSelected, sampleRUM };
    }
    const { weight, id } = window.hlx.rum;
    if (window.hlx && window.hlx.rum && window.hlx.rum.isSelected) {
      const sendPing = (pdata = data) => {
        // eslint-disable-next-line object-curly-newline, max-len, no-use-before-define
        const body = JSON.stringify({ weight, id, referer: window.location.href, generation: window.hlx.RUM_GENERATION, checkpoint, ...data });
        const url = `https://rum.hlx.page/.rum/${weight}`;
        // eslint-disable-next-line no-unused-expressions
        navigator.sendBeacon(url, body);
        // eslint-disable-next-line no-console
        console.debug(`ping:${checkpoint}`, pdata);
      };
      sampleRUM.cases = sampleRUM.cases || {
        cwv: () => sampleRUM.cwv(data) || true,
        lazy: () => {
          // use classic script to avoid CORS issues
          const script = document.createElement('script');
          script.src = 'https://rum.hlx.page/.rum/@adobe/helix-rum-enhancer@^1/src/index.js';
          document.head.appendChild(script);
          sendPing(data);
          return true;
        },
      };
      sendPing(data);
      if (sampleRUM.cases[checkpoint]) { sampleRUM.cases[checkpoint](); }
    }
  } catch (error) {
    // something went wrong
  }
}

/**
 * Loads a CSS file.
 * @param {string} href The path to the CSS file
 */
export function loadCSS(href, callback) {
  if (!document.querySelector(`head > link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', href);
    if (typeof callback === 'function') {
      link.onload = (e) => callback(e.type);
      link.onerror = (e) => callback(e.type);
    }
    document.head.appendChild(link);
  } else if (typeof callback === 'function') {
    callback('noop');
  }
}

/**
 * Retrieves the content of metadata tags.
 * @param {string} name The metadata name (or property)
 * @returns {string} The metadata value(s)
 */
export function getMetadata(name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...document.head.querySelectorAll(`meta[${attr}="${name}"]`)].map((m) => m.content).join(', ');
  return meta || null;
}

// Normally,we would check for DevDocs is using getMetadata('template') === 'documentation'.
// However, the first landing pages don't go to documentation mode, which matches the same behavior as Gatsby.
// To ensure DevDocs layout also gets applied to landing pages, we use Boolean(getMetadata('githubblobpath')) instead.
export const IS_DEV_DOCS = Boolean(getMetadata('githubblobpath'));

/**
 * Retrieves the top nav from the config.
 * @returns {string} The top nav HTML
 */
export async function fetchTopNavHtml() {
  return fetchNavHtml('pages:');
}

/**
 * Retrieves the side nav from the config.
 * @returns {string} The side nav HTML
 */
export async function fetchSideNavHtml() {
  return fetchNavHtml('subPages:');
}

/**
 * Retrieves the site-wide-banner json file
 * @returns {string} The site-wide-banner json file
 */
export async function fetchSiteWideBanner() {
  let pathPrefix = getMetadata('pathprefix')?.replace(/^\/|\/$/g, '');
  let siteWideBannerFile = `${window.location.origin}/${pathPrefix}/site-wide-banner.json`;
  let siteWideBannerJSON = await fetch(siteWideBannerFile)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          console.warn('Network response was not ok');
        }
      })
      .then(data => data)
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
      return siteWideBannerJSON;
}

/**
 * Retrieves the redirects json file
 * @returns {string} The redirect json file
 */
export async function fetchRedirectJson() {
  let pathPrefix = getMetadata('pathprefix').replace(/^\/|\/$/g, '');
  let redirectFile = `${window.location.origin}/${pathPrefix}/redirects.json`;
  let redirectJSON;

  // use the path to create a hash to store the file
  const hashCode = (s) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
  const redirectJSONHash = `${hashCode(redirectFile)}`;

  if (sessionStorage.getItem(redirectJSONHash)) {
    try {
      redirectJSON = JSON.parse(sessionStorage.getItem(redirectJSONHash));
    } catch (error) {
      console.error('Unable to parse: redirect json');
    }
  } else {
    redirectJSON = await fetch(redirectFile)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          console.warn('Network response was not ok');
        }
      })
      .then(data => data)
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
    sessionStorage.setItem(redirectJSONHash, JSON.stringify(redirectJSON));
  }

  return redirectJSON;
}

/**
 * Retrieves the nav with the specified name from the config.
 * @param {string} name The nav name
 * @returns {string} The nav HTML
 */
async function fetchNavHtml(name) {
  let pathPrefix = getMetadata('pathprefix').replace(/^\/|\/$/g, '');
  let navPath = `${window.location.origin}/${pathPrefix}/config`;
  const fragment = await loadFragment(navPath);

  let navItems;
  fragment.querySelectorAll("p").forEach((item) => {
    if (item.innerText === name) {
      navItems = item.parentElement.querySelector('ul');
      // relace annoying p tags
      const navItemsChild = navItems?.querySelectorAll('li');
      navItemsChild?.forEach((liItems) => {
        let p = liItems.querySelector('p');
        if (p) {
          p.replaceWith(p.firstChild);
        }
      });
    }
  });

  return navItems?.innerHTML ? navItems.innerHTML : Promise.reject(navItems?.innerHTML);
}

/**
 * Normalizes passed in anchor element's href so relative links point to
 * the right url
 * @param {object} anchorElem The anchor element
 * @param {string} pathPrefix The the path prefix
 */
function normalizePaths(anchorElem, pathPrefix) {
  const href = anchorElem.getAttribute('href');

  if (href && (href.startsWith('http://') || href.startsWith('https://'))) { // check external link
    anchorElem.target = '_blank';
    anchorElem.href = href;
    anchorElem.setAttribute("fullPath", true);
  } else {
    const path = new URL(href, 'https://example.com');
    const normalizedPath = cleanMarkdownExtension(path.pathname);
    anchorElem.pathname = decodeURIComponent(normalizedPath);
    anchorElem.href = `/${pathPrefix}${normalizedPath}`;
  }

  return anchorElem;
}

function cleanMarkdownExtension(pathName) {
  return pathName
    .replace('/src/pages/', '/')
    .replace('/index.md/', '')
    .replace('/index.md', '')
    .replace('index.md', '')
    .replace('.md/', '')
    .replace('.md', '');
};

function trailingSlashFix(pathName) {
  if (!pathName.endsWith('/')) {
    return `${pathName}/`;
  }
  return pathName;
}

/**
 * Adds one or more URLs to the dependencies for publishing.
 * @param {string|[string]} url The URL(s) to add as dependencies
 */
export function addPublishDependencies(url) {
  const urls = Array.isArray(url) ? url : [url];
  window.hlx = window.hlx || {};
  if (window.hlx.dependencies && Array.isArray(window.hlx.dependencies)) {
    window.hlx.dependencies = window.hlx.dependencies.concat(urls);
  } else {
    window.hlx.dependencies = urls;
  }
}

/**
 * Sanitizes a name for use as class name.
 * @param {string} name The unsanitized name
 * @returns {string} The class name
 */
export function toClassName(name) {
  return name && typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}

/*
 * Sanitizes a name for use as a js property name.
 * @param {string} name The unsanitized name
 * @returns {string} The camelCased name
 */
export function toCamelCase(name) {
  return toClassName(name).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

export function sectionIsDark(block) {
  if (!block) {
    return false;
  }

  const section = block.parentElement?.parentElement;

  return section && section.classList.contains('dark');
}

export function decorateLightOrDark(block, max = false) {
  if (!block) {
    return;
  }

  let cssClass = max ? 'spectrum--lightest' : 'spectrum--light';

  if (sectionIsDark(block)) {
    cssClass = max ? 'spectrum--darkest' : 'spectrum--dark';
  }

  block.classList.add(cssClass);
}

/**
 * Replace icons with inline SVG and prefix with codeBasePath.
 * @param {Element} element
 */
export function decorateIcons(element = document) {
  element.querySelectorAll('span.icon').forEach(async (span) => {
    if (span.classList.length < 2 || !span.classList[1].startsWith('icon-')) {
      return;
    }
    const icon = span.classList[1].substring(5);
    // eslint-disable-next-line no-use-before-define
    const resp = await fetch(`${window.hlx.codeBasePath}/icons/${icon}.svg`);
    if (resp.ok) {
      const iconHTML = await resp.text();
      if (iconHTML.match(/<style/i)) {
        const img = document.createElement('img');
        img.src = `data:image/svg+xml,${encodeURIComponent(iconHTML)}`;
        span.appendChild(img);
      } else {
        span.innerHTML = iconHTML;
      }
    }
  });
}

/**
 * Gets placeholders object
 * @param {string} prefix
 */
export async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  const loaded = window.placeholders[`${prefix}-loaded`];
  if (!loaded) {
    window.placeholders[`${prefix}-loaded`] = new Promise((resolve, reject) => {
      try {
        fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`)
          .then((resp) => resp.json())
          .then((json) => {
            const placeholders = {};
            json.data.forEach((placeholder) => {
              placeholders[toCamelCase(placeholder.Key)] = placeholder.Text;
            });
            window.placeholders[prefix] = placeholders;
            resolve();
          });
      } catch (error) {
        // error loading placeholders
        window.placeholders[prefix] = {};
        reject();
      }
    });
  }
  await window.placeholders[`${prefix}-loaded`];
  return (window.placeholders[prefix]);
}

/**
 * Decorates a block.
 * @param {Element} block The block element
 */
export function decorateBlock(block) {
  const shortBlockName = block.classList[0];
  if (shortBlockName) {
    block.classList.add('block');
    block.setAttribute('data-block-name', shortBlockName);
    block.setAttribute('data-block-status', 'initialized');
    const blockWrapper = block.parentElement;
    blockWrapper.classList.add(`${shortBlockName}-wrapper`);
    const childBlock = blockWrapper.querySelector('div')
    if(IS_DEV_DOCS){
      // ensure all documentation blocks are having white background.
      childBlock?.classList.add('background-color-white');
    }
    const section = block.closest('.section');
    if (section) section.classList.add(`${shortBlockName}-container`);
  }
}

/**
 * Extracts the config from a block.
 * @param {Element} block The block element
 * @returns {object} The block config
 */
export function readBlockConfig(block) {
  const config = {};
  block.querySelectorAll(':scope>div').forEach((row) => {
    if (row.children) {
      const cols = [...row.children];
      if (cols[1]) {
        const col = cols[1];
        const name = toClassName(cols[0].textContent);
        let value = '';
        if (col.querySelector('a')) {
          const as = [...col.querySelectorAll('a')];
          if (as.length === 1) {
            value = as[0].href;
          } else {
            value = as.map((a) => a.href);
          }
        } else if (col.querySelector('img')) {
          const imgs = [...col.querySelectorAll('img')];
          if (imgs.length === 1) {
            value = imgs[0].src;
          } else {
            value = imgs.map((img) => img.src);
          }
        } else if (col.querySelector('p')) {
          const ps = [...col.querySelectorAll('p')];
          if (ps.length === 1) {
            value = ps[0].textContent;
          } else {
            value = ps.map((p) => p.textContent);
          }
        } else value = row.children[1].textContent;
        config[name] = value;
      }
    }
  });
  return config;
}

/**
 * Decorates all sections in a container element.
 * @param {Element} $main The container element
 */
export function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.setAttribute('data-section-status', 'initialized');
    section.style.display = 'none';

    /* process section metadata */
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style.split(',').map((style) => toClassName(style.trim()));
          styles.forEach((style) => {
            section.classList.add(style);
            if (style === 'dark') {
              section.classList.add('spectrum--dark');
            }
          });
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      sectionMeta.parentNode.remove();
    }
  });
}

/**
 * Updates all section status in a container element.
 * @param {Element} main The container element
 */
export function updateSectionsStatus(main) {
  const sections = [...main.querySelectorAll(':scope > div.section')];
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const status = section.getAttribute('data-section-status');
    if (status !== 'loaded') {
      const loadingBlock = section.querySelector('.block[data-block-status="initialized"], .block[data-block-status="loading"]');
      if (loadingBlock) {
        section.setAttribute('data-section-status', 'loading');
        break;
      } else {
        section.setAttribute('data-section-status', 'loaded');
        section.style.display = null;
      }
    }
  }
}

/**
 * Decorates all blocks in a container element.
 * @param {Element} main The container element
 */
export function decorateBlocks(main) {
  main
    .querySelectorAll('div.section > div > div')
    .forEach((block) => decorateBlock(block));
}

/**
 * Builds a block DOM Element from a two dimensional array
 * @param {string} blockName name of the block
 * @param {any} content two dimensional array or string or object of content
 */
export function buildBlock(blockName, content) {
  const table = Array.isArray(content) ? content : [[content]];
  const blockEl = document.createElement('div');
  // build image block nested div structure
  blockEl.classList.add(blockName);
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((col) => {
      const colEl = document.createElement('div');
      const vals = col.elems ? col.elems : [col];
      vals.forEach((val) => {
        if (val) {
          if (typeof val === 'string') {
            colEl.innerHTML += val;
          } else {
            colEl.appendChild(val);
          }
        }
      });
      rowEl.appendChild(colEl);
    });
    blockEl.appendChild(rowEl);
  });
  return (blockEl);
}

/**
 * Loads JS and CSS for a block.
 * @param {Element} block The block element
 */
export async function loadBlock(block, eager = false) {
  parseAttribute(block);
  if (!(block.getAttribute('data-block-status') === 'loading' || block.getAttribute('data-block-status') === 'loaded')) {
    block.setAttribute('data-block-status', 'loading');
    const blockName = block.getAttribute('data-block-name');
    if (blockName !== 'nav') {
      try {
        const cssLoaded = new Promise((resolve) => {
          loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`, resolve);
        });
        const decorationComplete = new Promise((resolve) => {
          (async () => {
            try {
              const mod = await import(`../blocks/${blockName}/${blockName}.js`);
              if (mod.default) {
                await mod.default(block, blockName, document, eager);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.log(`failed to load module for ${blockName}`, error);
            }
            resolve();
          })();
        });
        await Promise.all([cssLoaded, decorationComplete]);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`failed to load block ${blockName}`, error);
      }
    }

    block.setAttribute('data-block-status', 'loaded');
  }
}

/**
 * Loads JS and CSS for all blocks in a container element.
 * @param {Element} main The container element
 */
export async function loadBlocks(main) {
  updateSectionsStatus(main);
  const blocks = [...main.querySelectorAll('div.block')];
  for (let i = 0; i < blocks.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadBlock(blocks[i]);
    updateSectionsStatus(main);
  }
}

/**
 * Returns a picture element with webp and fallbacks
 * @param {string} src The image URL
 * @param {boolean} eager load image eager
 * @param {Array} breakpoints breakpoints and corresponding params (eg. width)
 */
export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [{ media: '(min-width: 400px)', width: '2000' }, { width: '750' }]) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const { origin, pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${origin}${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${origin}${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', `${origin}${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
    }
  });

  return picture;
}

/**
 * Normalizes all headings within a container element.
 * @param {Element} el The container element
 * @param {[string]} allowedHeadings The list of allowed headings (h1 ... h6)
 */
export function normalizeHeadings(el, allowedHeadings) {
  const allowed = allowedHeadings.map((h) => h.toLowerCase());
  el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((tag) => {
    const h = tag.tagName.toLowerCase();
    if (allowed.indexOf(h) === -1) {
      // current heading is not in the allowed list -> try first to "promote" the heading
      let level = parseInt(h.charAt(1), 10) - 1;
      while (allowed.indexOf(`h${level}`) === -1 && level > 0) {
        level -= 1;
      }
      if (level === 0) {
        // did not find a match -> try to "downgrade" the heading
        while (allowed.indexOf(`h${level}`) === -1 && level < 7) {
          level += 1;
        }
      }
      if (level !== 7) {
        tag.outerHTML = `<h${level} id="${tag.id}">${tag.textContent}</h${level}>`;
      }
    }
  });
}

/**
 * Set template (page structure) and theme (page styles).
 */
export function decorateTemplateAndTheme() {
  const addClasses = (elem, classes) => {
    classes.split(',').forEach((v) => {
      elem.classList.add(toClassName(v.trim()));
    });
  };
  const template = getMetadata('template');
  if (template) addClasses(document.body, template);
  const theme = getMetadata('theme');
  if (theme) addClasses(document.body, theme);
}

export function getLinks(element, type) {
  const links = element.querySelectorAll('a');
  const buttonLinks = Array.from(links).filter(link => {
    const [_, queryString] = link.href.split('?');
    const searchParams = new URLSearchParams(queryString);
    // In Franklin, all links get turned into buttons. However, in EDS DevBiz, we also pass high-res images as links. And so, to support both, we check the aio_type parameter to see if it matches the type we're looking for. Otherwise, we assume it's a button.
    const aioType = searchParams.get('aio_type');
    return aioType ? aioType === type : type === 'button';
  });
  return buttonLinks;
}

export function decoratePictures(element) {
  getLinks(element, 'image').forEach((a) => {
    let img = document.createElement('img');
    img.src = a.href;
    img.alt = a.textContent;
    let picture = document.createElement('picture');
    picture.appendChild(img);
    a.parentNode.replaceChild(picture, a);
  });
}

/**
 * decorates paragraphs containing a single link as buttons.
 * @param {Element} element container element
 */

export function decorateButtons(element) {
  getLinks(element, 'button').forEach((a) => {
    a.title = a.title || a.textContent;
    if (a.href !== a.textContent) {
      const up = a.parentElement;
      const twoup = a.parentElement.parentElement;
      if (!a.querySelector('img')) {
        if (up.childNodes.length === 1 && (up.tagName === 'P' || up.tagName === 'DIV')) {
          a.className = 'button primary'; // default
          up.classList.add('button-container');
        }
        if (up.childNodes.length === 1 && up.tagName === 'STRONG'
          && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
          a.className = 'button primary';
          twoup.classList.add('button-container');
        }
        if (up.childNodes.length === 1 && up.tagName === 'EM'
          && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
          a.className = 'button secondary';
          twoup.classList.add('button-container');
        }
      }
    }
  });
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * load LCP block and/or wait for LCP in default content.
 */
export async function waitForLCP(lcpBlocks) {
  const block = document.querySelector('.block');
  const hasLCPBlock = (block && lcpBlocks.includes(block.getAttribute('data-block-name')));
  if (hasLCPBlock) await loadBlock(block, true);

  document.body.style.display = null;
  document.querySelector('body').classList.add('appear');

  const lcpCandidate = document.querySelector('main img');
  await new Promise((resolve) => {
    if (lcpCandidate && !lcpCandidate.complete) {
      lcpCandidate.setAttribute('loading', 'eager');
      lcpCandidate.addEventListener('load', () => resolve());
      lcpCandidate.addEventListener('error', () => resolve());
    } else {
      resolve();
    }
  });
}

export function initHlx() {
  document.body.style.display = 'none';
  window.hlx = window.hlx || {};
  window.hlx.lighthouse = new URLSearchParams(window.location.search).get('lighthouse') === 'on';
  window.hlx.codeBasePath = '';

  const scriptEl = document.querySelector('script[src$="/scripts/scripts.js"]');
  if (scriptEl) {
    try {
      [window.hlx.codeBasePath] = new URL(scriptEl.src).pathname.split('/scripts/scripts.js');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
    }
  }
}

/**
 * github actions block
 */

export function githubActionsBlock(doc) {
  let baseUrl = getMetadata('githubblobpath');
  if (!baseUrl) return;
  const githubEditUrl = baseUrl.replace('blob', 'edit');
  const githubIssueUrl = baseUrl.replace('blob', 'issues/new?title=Issue%20in%20');
  if (!doc.querySelector('.herosimple-container') && !doc.querySelector('.hero-container')) {
    const newContent = doc.createElement('div');
    newContent.classList.add('section', 'github-actions-wrapper');
    newContent.innerHTML = `
              <div class="github-actions-block">
                      <a class="action-buttons" target="_blank" rel="noopener noreferrer nofollow" href=${githubEditUrl} role="button">
                          <div>
                             <svg aria-hidden="true" role="img" viewBox="0 0 36 36" aria-label="Edit" class="spectrum-Icon spectrum-Icon--sizeS"><path d="M33.567 8.2L27.8 2.432a1.215 1.215 0 0 0-.866-.353H26.9a1.371 1.371 0 0 0-.927.406L5.084 23.372a.99.99 0 0 0-.251.422L2.055 33.1c-.114.377.459.851.783.851a.251.251 0 0 0 .062-.007c.276-.063 7.866-2.344 9.311-2.778a.972.972 0 0 0 .414-.249l20.888-20.889a1.372 1.372 0 0 0 .4-.883 1.221 1.221 0 0 0-.346-.945zM11.4 29.316c-2.161.649-4.862 1.465-6.729 2.022l2.009-6.73z"></path></svg>
                          </div>
                          <div>Edit in GitHub</div>
                      </a>
                      <a class="action-buttons" target="_blank" rel="noopener noreferrer nofollow" href=${githubIssueUrl} role="button">
                          <div>
                             <svg aria-hidden="true" role="img" viewBox="0 0 36 36" aria-label="Bug" class="spectrum-Icon spectrum-Icon--sizeS"><path d="M26.194 7.242A9.8 9.8 0 0 0 18 3a9.8 9.8 0 0 0-8.194 4.242A11.943 11.943 0 0 0 18 10.5a11.943 11.943 0 0 0 8.194-3.258zm-20.978-.85L2.548 7.726a18.1 18.1 0 0 0 4.581 5.114A27.459 27.459 0 0 0 6.118 18H0v3h6.045a13.6 13.6 0 0 0 2.5 6.363 15.078 15.078 0 0 0-4.5 6.16l2.7 1.35a12.052 12.052 0 0 1 3.774-5.2 11.571 11.571 0 0 0 5.981 3.185V13.5A14.982 14.982 0 0 1 5.216 6.392zM36 21v-3h-6.118a27.459 27.459 0 0 0-1.011-5.16 18.1 18.1 0 0 0 4.581-5.114l-2.668-1.334A14.982 14.982 0 0 1 19.5 13.5v19.358a11.571 11.571 0 0 0 5.979-3.185 12.052 12.052 0 0 1 3.774 5.2l2.7-1.35a15.078 15.078 0 0 0-4.5-6.16A13.6 13.6 0 0 0 29.955 21z"></path></svg>
                          </div>
                          <div>Log an issue</div>
                      </a>
                      <a role="button" class="copy-markdown-button action-buttons" data-github-url="${baseUrl}" onclick="copyMarkdownContent(this, event)" role="button">
                        <div>
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
                            <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><rect class="fill" height="1" rx="0.25" width="1" x="16" y="11" /><rect class="fill" height="1" rx="0.25" width="1" x="16" y="9" /><rect class="fill" height="1" rx="0.25" width="1" x="16" y="7" /><rect class="fill" height="1" rx="0.25" width="1" x="16" y="5" /><rect class="fill" height="1" rx="0.25" width="1" x="16" y="3" /><rect class="fill" height="1" rx="0.25" width="1" x="16" y="1" /><rect class="fill" height="1" rx="0.25" width="1" x="14" y="1" /><rect class="fill" height="1" rx="0.25" width="1" x="12" y="1" /><rect class="fill" height="1" rx="0.25" width="1" x="10" y="1" /><rect class="fill" height="1" rx="0.25" width="1" x="8" y="1" /><rect class="fill" height="1" rx="0.25" width="1" x="6" y="1" /><rect class="fill" height="1" rx="0.25" width="1" x="6" y="3" /><rect class="fill" height="1" rx="0.25" width="1" x="6" y="5" /><rect class="fill" height="1" rx="0.25" width="1" x="6" y="7" /><rect class="fill" height="1" rx="0.25" width="1" x="6" y="9" /><rect class="fill" height="1" rx="0.25" width="1" x="6" y="11" /><rect class="fill" height="1" rx="0.25" width="1" x="8" y="11" /><rect class="fill" height="1" rx="0.25" width="1" x="10" y="11" /><rect class="fill" height="1" rx="0.25" width="1" x="12" y="11" /><rect class="fill" height="1" rx="0.25" width="1" x="14" y="11" /><path class="fill" d="M5,6H1.5a.5.5,0,0,0-.5.5v10a.5.5,0,0,0,.5.5h10a.5.5,0,0,0,.5-.5V13H5.5a.5.5,0,0,1-.5-.5Z" />
                          </svg>
                        </div>
                        <div class="copy-markdown-button-label">Copy as Markdown</div>
                      </a>
              </div>
      `;
    const contentHeader = doc.querySelector('.content-header');
    contentHeader?.append(newContent);
    const isBreadCrumbs = doc.querySelector('.breadcrumbs-container');
    if(!isBreadCrumbs){
      contentHeader.classList.add('no-breadcrumbs');
    }
  }
};

/**
 * Copy markdown content from GitHub to clipboard
 */
window.copyMarkdownContent = async function(btn, event) {
  // Prevent default anchor behavior
  if (event) {
    event.preventDefault();
  }
  
  const baseUrl = btn.dataset.githubUrl;
  const rawUrl = baseUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  const label = btn.querySelector('.copy-markdown-button-label');
  const originalText = label.textContent;
  
  try {
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    await navigator.clipboard.writeText(await response.text());
    label.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { 
      label.textContent = originalText; 
      btn.classList.remove('copied'); 
    }, 3000);
    console.log('Markdown copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy markdown:', error);
    window.open(rawUrl, '_blank');
  }
}

/**
 * parse attributes from row and added to particular blcok
 */

function parseAttribute(block) {
  const codeTags = block.querySelectorAll('code');
  const ATTRIBUTE_PREFIX = 'data-';
  codeTags.forEach(codeTag => {
    const dataContent = codeTag?.textContent?.trim();
    if (dataContent.startsWith(ATTRIBUTE_PREFIX)) {
      const [key, value] = dataContent.split('=').map(part => part.trim());
      block.setAttribute(key, value || true);
      let parentDiv = codeTag.closest('div');
      if (parentDiv) {
        let grandparentDiv = parentDiv.parentElement;
        if (grandparentDiv) {
          grandparentDiv.remove();
        }
      }
    }
  });
}



/**
 * Loads all blocks in a section.
 * @param {Element} section The section element
 */

export async function loadSection(section, loadCallback) {
  const status = section.dataset.sectionStatus;
  if (!status || status === 'initialized') {
    section.dataset.sectionStatus = 'loading';
    const blocks = [...section.querySelectorAll('div.block')];
    for (let i = 0; i < blocks.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await loadBlock(blocks[i]);
    }
    if (loadCallback) await loadCallback(section);
    section.dataset.sectionStatus = 'loaded';
    section.style.display = null;
  }
}

/**
 * Loads all sections.
 * @param {Element} element The parent element of sections to load
 */

export async function loadSections(element) {
  const sections = [...element.querySelectorAll('div.section')];
  for (let i = 0; i < sections.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadSection(sections[i]);
    if (i === 0 && sampleRUM.enhance) {
      sampleRUM.enhance();
    }
  }
}

initHlx();
