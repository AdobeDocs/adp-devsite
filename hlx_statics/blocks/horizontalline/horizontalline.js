/**
 * Replaces the block's authored content with a single <hr> element.
 * @param {Element} block The horizontalline block element
 */
export default async function decorate(block) {
  block.innerHTML = '';
  block.appendChild(document.createElement('hr'));
}
