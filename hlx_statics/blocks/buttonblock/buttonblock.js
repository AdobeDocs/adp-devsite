import { decorateButtons } from "../../scripts/lib-adobeio.js";

/**
 * Decorates the button block.
 * @param {Element} block The calendar block element.
 */
export default async function decorate(block) {
  const href = block.getAttribute('data-href');
  const variant = block.getAttribute('data-variant');
  const position = block.getAttribute('data-position');
  const innerText = block.querySelector('div div').innerText;

  const pTag = document.createElement('p');
  pTag.style.cssText = `display: flex;${position ? `justify-content: ${position};` : ''}`;

  const anchorTag = document.createElement('a');
  anchorTag.setAttribute('href', href || '#');
  anchorTag.innerHTML = innerText;

  if (variant === 'primary') {
    const strongTag = document.createElement('strong');
    strongTag.appendChild(anchorTag);
    pTag.appendChild(strongTag);
  } else {
    pTag.appendChild(anchorTag);
  }

  block.innerHTML = '';
  block.appendChild(pTag);
  decorateButtons(block);
}
