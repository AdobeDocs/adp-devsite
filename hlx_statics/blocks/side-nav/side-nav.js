import { fetchNavHtml } from '../../scripts/lib-helix.js';
/**
 * decorates the side-nav
 * @param {Element} block The site-nav block element
 */
export default async function decorate(block) {
  // TODO can be smarter on when to grab the nav 
  const html = await fetchNavHtml();
  block.innerHTML = html;
}