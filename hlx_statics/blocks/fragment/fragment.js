/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

import {
    decorateMain,
  } from '../../scripts/scripts.js';
  import {
    loadSections,
    getMetadata,
    IS_DEV_DOCS
  } from '../../scripts/lib-helix.js';
  import {
    isLocalHostEnvironment
  } from '../../scripts/lib-adobeio.js';

  // Dedup concurrent config validation fetches within the same page load.
  // Multiple callers (top-nav, buttons, side-nav) all loadFragment the same
  // config URL — this ensures only ONE network request is made.
  const configValidationCache = new Map();

  /**
   * Loads a fragment.
   * @param {string} path The path to the fragment
   * @returns {HTMLElement} The root element of the fragment
   */
  export async function loadFragment(path) {
    if (path) {
      // special case for config to load locally as it won't have the .plain.html path

      const lastSlashIndex = path?.lastIndexOf('/');
      const lastPrefix = path?.substring(lastSlashIndex + 1);
      const isLocalHostForDocs = isLocalHostEnvironment(window.location.origin) && IS_DEV_DOCS;

      let fetchPathUrl;
      if (lastPrefix && lastPrefix === 'config') {
        fetchPathUrl = path;
      } else {
        // Remove existing extension
        let resolvedPath = path.replace(/\.\w+$/, '');


        // Use .md for localhost, .plain.html for production
        const fileExtension = isLocalHostForDocs ? '.md' : '.plain.html';

        // Handle absolute paths by prepending pathPrefix if needed
        if (resolvedPath.startsWith('/')) {
          const pathPrefix = getMetadata('pathprefix');
          if (pathPrefix && !resolvedPath.startsWith(`/${pathPrefix}`)) {
            resolvedPath = `${pathPrefix}${resolvedPath}`;
          }
          const origin = isLocalHostForDocs
            ? window.location.origin.replace(':3000', ':3002')
            : window.location.origin;
          fetchPathUrl = `${origin}${resolvedPath}${fileExtension}`;
        } else {
          // Relative paths
          if (isLocalHostForDocs) {
            const fullUrl = new URL(`${resolvedPath}${fileExtension}`, window.location.href);
            fetchPathUrl = fullUrl.href.replace(':3000', ':3002');
          } else {
            fetchPathUrl = `${resolvedPath}${fileExtension}`;
          }
        }
      }

      const hashCode = (s) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
      const fragmentHash = `${hashCode(fetchPathUrl)}`;
      const fragmentLmKey = `${fragmentHash}_lm`;
      let main;

      const isConfig = lastPrefix === 'config';
      const cachedHtml = sessionStorage.getItem(fragmentHash);

      if (isConfig) {
        // Config validation: one fetch per page load, shared across all callers.
        // Uses If-Modified-Since revalidation (cache: 'no-cache') so the browser
        // leverages its HTTP cache for 304 responses while always checking freshness.
        if (!configValidationCache.has(fragmentHash)) {
          configValidationCache.set(fragmentHash, (async () => {
            try {
              const resp = await fetch(fetchPathUrl, { cache: 'no-cache' });
              if (!resp.ok) return;

              const currentLm = resp.headers.get('last-modified');
              const storedLm = sessionStorage.getItem(fragmentLmKey);
              const storedHtml = sessionStorage.getItem(fragmentHash);

              if (currentLm && storedLm === currentLm && storedHtml) {
                console.log(`[fragment] config valid (last-modified: ${currentLm})`);
                return;
              }

              console.log(`[fragment] config ${storedHtml ? 'stale' : 'miss'} (${storedLm} → ${currentLm})`);
              const htmlText = await resp.text();
              const temp = document.createElement('main');
              if (isLocalHostForDocs) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const mainContent = doc.querySelector('main');
                if (mainContent) temp.innerHTML = mainContent.innerHTML;
              } else {
                temp.innerHTML = htmlText;
              }
              sessionStorage.setItem(fragmentHash, temp.innerHTML);
              if (currentLm) sessionStorage.setItem(fragmentLmKey, currentLm);
            } catch (e) {
              console.warn('[fragment] config validation failed', e);
            }
          })());
        }

        await configValidationCache.get(fragmentHash);
        const content = sessionStorage.getItem(fragmentHash);
        if (content) {
          main = document.createElement('main');
          main.innerHTML = content;
        }
      } else if (cachedHtml) {
        main = document.createElement('main');
        main.innerHTML = cachedHtml;
      } else {
        const resp = await fetch(fetchPathUrl);
        if (resp.ok) {
          const htmlText = await resp.text();
          main = document.createElement('main');
          if (isLocalHostForDocs) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const mainContent = doc.querySelector('main');
            if (mainContent) {
              main.innerHTML = mainContent.innerHTML;
            }
          } else {
            main.innerHTML = htmlText;
          }
          sessionStorage.setItem(fragmentHash, main.innerHTML);
        }
      }

    // Always run initialization for both cached and fresh fragments
    if (main) {
      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.getAttribute("data-src");
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      // Get the wrapper that contains this specific block
      const wrapper = block.parentElement;

      // Add classes from fragment section to the current section
      const currentSection = block.closest('.section');
      if (currentSection) {
        currentSection.classList.add(...fragmentSection.classList);
      }

      // Replace only this fragment's wrapper with the fragment content
      wrapper.replaceWith(...fragment.childNodes);
    }
  }
}
