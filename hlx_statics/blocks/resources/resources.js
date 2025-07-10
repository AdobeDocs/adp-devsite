import { createTag, decorateButtons, removeEmptyPTags } from '../../scripts/lib-adobeio.js';

/**
 * Decorates the resources block.  This block is only allowed 1 block in the md file.
 * @param {Element} block - The banner resources element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'resources');

  block.querySelectorAll('a').forEach((link) =>{
    link.classList.add('spectrum-Link', 'spectrum-Link--quiet');
    // Check if it's an external link
    const href = link.getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      const externalLink = createTag('div', {class: 'external-icon'});
      externalLink.innerHTML = `<svg viewBox="0 0 36 36" className="spectrum-Icon spectrum-Icon--sizeS" focusable="false" aria-hidden="true" role="img">
      <path d="M33 18h-2a1 1 0 0 0-1 1v11H6V6h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v30a1 1 0 0 0 1 1h30a1 1 0 0 0 1-1V19a1 1 0 0 0-1-1z"></path>
      <path d="M33.5 2H22.754a.8.8 0 0 0-.754.8.784.784 0 0 0 .235.56l3.786 3.79-7.042 7.042a1 1 0 0 0 0 1.415l1.414 1.414a1 1 0 0 0 1.414 0l7.043-7.042 3.786 3.785A.781.781 0 0 0 33.2 14a.8.8 0 0 0 .8-.754V2.5a.5.5 0 0 0-.5-.5z"></path>
      </svg>`;
      link.parentElement.append(externalLink);
    }
  })
}
