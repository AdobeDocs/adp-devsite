import { decorateButtons } from "../../scripts/lib-adobeio.js";

/**
 * Decorates the button block.
 * @param {Element} block The calendar block element.
 */
export default async function decorate(block) {
    const { href = "#", variant = "outline", position = "start" } = block.dataset;
    const innerText = block.querySelector('div div').innerText;

    const paragraphTag = document.createElement('p');
    paragraphTag.style.cssText = `display: flex;${position ? `justify-content: ${position};` : ''}`;

    const anchorTag = document.createElement('a');
    anchorTag.setAttribute('href', href);
    anchorTag.innerHTML = innerText;

    if (variant === 'primary') {
        const strongTag = document.createElement('strong');
        strongTag.appendChild(anchorTag);
        paragraphTag.appendChild(strongTag);
    } else {
        paragraphTag.appendChild(anchorTag);
    }

    block.innerHTML = '';
    block.appendChild(paragraphTag);
    decorateButtons(block);
}
