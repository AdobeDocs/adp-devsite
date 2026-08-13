/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
 * Local, milo-compatible helpers used by the marketo block.
 * Only the subset of the milo utils API that the marketo block depends on is
 * provided here. Shared logic is re-used from the adp-devsite scripts.
 */
import { getMetadata as getSiteMetadata } from '../scripts/lib-helix.js';

export const MILO_EVENTS = {
  DEFERRED: 'milo:deferred',
  QUERY_INDEX_PRIMARY_LOADED: 'milo:query-index:primary-loaded',
  QUERY_INDEX_ALL_LOADED: 'milo:query-index:all-loaded',
};

export const SLD = 'aem';

/**
 * Retrieves the content of metadata tags.
 * @param {string} name The metadata name (or property)
 * @returns {string} The metadata value(s)
 */
export function getMetadata(name) {
  return getSiteMetadata(name);
}

/**
 * Creates a tag with the given name, attributes and content.
 * @param {string} tag The tag name
 * @param {object} attributes An object containing the attributes
 * @param {string|Element|Element[]} html Content to append or insert
 * @param {object} options Additional options (e.g. parent)
 * @returns The new tag
 */
export function createTag(tag, attributes, html, options = {}) {
  const el = document.createElement(tag);
  if (html) {
    if (html.nodeType === Node.ELEMENT_NODE
      || html instanceof SVGElement
      || html instanceof DocumentFragment) {
      el.append(html);
    } else if (Array.isArray(html)) {
      el.append(...html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  options.parent?.append(el);
  return el;
}

/**
 * Returns the site configuration.
 * @returns {object} The site configuration
 */
export const getConfig = () => {
  const base = window.hlx?.codeBasePath || '';
  return {
    base,
    htmlExclude: [],
    placeholders: {},
  };
};

/**
 * Loads an external script.
 * @param {string} url The script url
 * @param {string} type The script type
 * @param {object} params Additional options
 * @returns {Promise} A promise resolving when the script is loaded
 */
export const loadScript = (url, type, { mode, id } = {}) => new Promise((resolve, reject) => {
  let script = document.querySelector(`head > script[src="${url}"]`);
  if (!script) {
    const { head } = document;
    script = document.createElement('script');
    script.setAttribute('src', url);
    if (id) script.setAttribute('id', id);
    if (type) {
      script.setAttribute('type', type);
    }
    if (['async', 'defer'].includes(mode)) script.setAttribute(mode, true);
    head.append(script);
  }

  if (script.dataset.loaded) {
    resolve(script);
    return;
  }

  const onScript = (event) => {
    script.removeEventListener('load', onScript);
    script.removeEventListener('error', onScript);

    if (event.type === 'error') {
      reject(new Error(`error loading script: ${script.src}`));
    } else if (event.type === 'load') {
      script.dataset.loaded = true;
      resolve(script);
    }
  };
  script.addEventListener('load', onScript);
  script.addEventListener('error', onScript);
});

/**
 * Loads a link element into the head.
 * @param {string} href The link url
 * @param {object} params Additional attributes and callback
 * @returns {HTMLElement} The link element
 */
export function loadLink(href, {
  id, as, callback, crossorigin, rel, fetchpriority,
} = {}) {
  const selector = rel === 'stylesheet'
    ? `link[href="${href}"][rel="stylesheet"]`
    : `link[href="${href}"]`;
  let link = document.head.querySelector(selector);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    if (id) link.setAttribute('id', id);
    if (as) link.setAttribute('as', as);
    if (crossorigin) link.setAttribute('crossorigin', crossorigin);
    if (fetchpriority) link.setAttribute('fetchpriority', fetchpriority);
    link.setAttribute('href', href);
    if (callback) {
      link.onload = (e) => callback(e.type);
      link.onerror = (e) => callback(e.type);
    }
    document.head.appendChild(link);
  } else if (callback) {
    callback('noop');
  }
  return link;
}

const utf8ToB64 = (str) => window.btoa(unescape(encodeURIComponent(str)));
const b64ToUtf8 = (str) => decodeURIComponent(escape(window.atob(str)));

/**
 * Parses a base64 encoded config.
 * @param {string} encodedConfig The encoded config
 * @returns {object} The parsed config
 */
export function parseEncodedConfig(encodedConfig) {
  try {
    return JSON.parse(b64ToUtf8(decodeURIComponent(encodedConfig)));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
  return null;
}

/**
 * Creates an intersection observer for the given element.
 * @param {object} params Observer params
 * @returns {IntersectionObserver} The observer
 */
export function createIntersectionObserver({ el, callback, once = true, options = {} }) {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        if (once) observer.unobserve(entry.target);
        callback(entry.target, entry);
      }
    });
  }, options);
  io.observe(el);
  return io;
}

/**
 * Localizes a link. The adp-devsite is English-only, so the href is returned
 * unchanged.
 * @param {string} href The link href
 * @returns {string} The link href
 */
export async function localizeLinkAsync(href) {
  return href;
}
