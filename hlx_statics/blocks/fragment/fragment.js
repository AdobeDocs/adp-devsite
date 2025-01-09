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
      // Remove any domain/protocol if present
      const cleanPath = path.replace(/^(https?:)?\/\/[^/]+/, '');
      // Ensure path starts with /
      const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      const fragmentPath = `${normalizedPath}.plain.html`;
      
      try {
        const resp = await fetch(fragmentPath);
        if (resp.ok) {
          const main = document.createElement('main');
          const content = await resp.text();
          main.innerHTML = content;

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
        console.error('Failed to load fragment:', path, 'Status:', resp.status);
      } catch (error) {
        console.error('Error loading fragment:', error);
      }
    }
    return null;
  }
  
  export default async function decorate(block) {
    const link = block.querySelector('a');
    const path = link ? link.getAttribute('href') : block.textContent.trim();
    const fragment = await loadFragment(path);
    if (fragment) {
      const fragmentSection = fragment.querySelector(':scope .section');
      if (fragmentSection) {
        block.closest('.section').classList.add(...fragmentSection.classList);
        block.closest('.fragment').replaceWith(...fragment.childNodes);
      }
    }
  }