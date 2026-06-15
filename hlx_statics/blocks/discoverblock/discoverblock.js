import { decorateAnchorLink } from "../../scripts/lib-adobeio.js";

/**
 * decorates the discover block
 * @param {Element} block The discover block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'discover');

  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    decorateAnchorLink(h);
  });

  const width = block.getAttribute('data-width');
  const wrapper = block.closest('.discoverblock-wrapper');

  const hasImage = block.querySelector('img') !== null;
  if (hasImage) {
    let imageWidth = (2 * 1280) / 12;
    imageWidth = imageWidth + 156;
    wrapper.style.width = imageWidth + 'px';

    const image = block.querySelector('img');

    image.style.width = '100px';
    image.style.height = 'auto';
    image.style.flexShrink = '0';

    block.classList.add('has-image');
    image.classList.add('discover-image');

    block.insertBefore(image, block.firstChild);

    const buttonContainer = block.querySelector('.button-container');
    if (buttonContainer && buttonContainer.parentElement) {
      buttonContainer.parentElement.classList.add('discover-content-with-image');
    }
  } else if (width) {
    wrapper.style.width = width;
  }

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    if (hasImage) {
      heading.classList.add('discover-heading-with-image');
    }
    const headingClone = heading.cloneNode(true);

    headingClone.classList.add('discoverblock-heading');
    wrapper.parentElement.insertBefore(headingClone, wrapper);

    heading.remove();
  }
}
