
import { decorateButtons } from "../../scripts/lib-adobeio.js";

/**
 * @param {Element} block
 */
export default async function decorate(block) {

  block.querySelectorAll('a').forEach((anchor) => {
    const parent = anchor.parentElement;
    const p = document.createElement('p');

    if (parent?.classList.contains('button-container')) {
      p.appendChild(anchor);
      parent.appendChild(p);
    }

    if (parent?.tagName === 'STRONG') {
      parent.replaceWith(p);
      p.appendChild(parent);
    }

    anchor.closest('div').classList.add('all-button-wrapper')

  });

  decorateButtons(block);
}
