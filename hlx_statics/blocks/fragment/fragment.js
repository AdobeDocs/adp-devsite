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
    getMetadata
  } from '../../scripts/lib-helix.js';
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

      let fetchPathUrl;
      if (lastPrefix && lastPrefix === 'config') {
        fetchPathUrl = path;
      } else {
        // Remove existing extension and add .plain.html
        let resolvedPath = path.replace(/\.\w+$/, '');

        // Handle absolute paths by prepending pathPrefix if needed
        if (resolvedPath.startsWith('/')) {
          const pathPrefix = getMetadata('pathprefix');
          if (pathPrefix && !resolvedPath.startsWith(`/${pathPrefix}`)) {
            resolvedPath = `${pathPrefix}${resolvedPath}`;
          }
          fetchPathUrl = `${window.location.origin}${resolvedPath}.plain.html`;
        } else {
          // Relative paths work as-is with fetch
          fetchPathUrl = `${resolvedPath}.plain.html`;
        }
      }

      const hashCode = (s) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
      const fragmentHash = `${hashCode(fetchPathUrl)}`;
      let main;

    if (sessionStorage.getItem(fragmentHash)) {
      main = document.createElement('main');
      main.innerHTML = sessionStorage.getItem(fragmentHash);
    } else {
      const resp = await fetch(fetchPathUrl);
      if (resp.ok) {
        main = document.createElement('main');
        main.innerHTML = await resp.text();
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

      // Extract content from fragment section, not the section wrapper itself
      const fragmentContent = [...fragmentSection.childNodes];

      // Replace only this fragment's wrapper with the fragment's content
      wrapper.replaceWith(...fragmentContent);
    }
  }
}
