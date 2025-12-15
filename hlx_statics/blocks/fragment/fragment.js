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

      const fetchPathUrl = (lastPrefix && lastPrefix === 'config') ? `${path}` : `${path}.plain.html`;

      const hashCode = (s) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
      const fragmentHash = `${hashCode(fetchPathUrl)}`;
      let main;

    if (sessionStorage.getItem(fragmentHash)) {
      main = document.createElement('main');
      main.innerHTML = sessionStorage.getItem(fragmentHash);
      return main;
    } else {
      const resp = await fetch(fetchPathUrl);
      if (resp.ok) {
        main = document.createElement('main');
        main.innerHTML = await resp.text();

        sessionStorage.setItem(fragmentHash, main.innerHTML);
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
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.getAttribute("data-src").trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.closest('.section').classList.add(...fragmentSection.classList);
      block.closest('.fragment').replaceWith(...fragment.childNodes);
    }
  }
}
