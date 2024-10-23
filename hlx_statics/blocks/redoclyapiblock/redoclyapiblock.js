import { createTag } from '../../scripts/lib-adobeio.js';
export default function decorate(block) {
  // https://redocly.com/docs/api-reference-docs/guides/on-premise-html-element#steps
  const redocly_container = createTag('div', {id: 'redocly_container'});
  block.firstElementChild.replaceWith(redocly_container);
}
  