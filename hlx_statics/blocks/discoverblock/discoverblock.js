import { createTag, decorateAnchorLink } from "../../scripts/lib-adobeio.js";

/**
 * decorates the discover block
 * @param {Element} block The discover block element
 */
export default async function decorate(block) {
   block.setAttribute('daa-lh', 'discover');

  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    decorateAnchorLink(h);
  });
  // Set width based on data-width attribute
  const width = block.getAttribute('data-width');
  const wrapper = block.closest('.discoverblock-wrapper');

  // If there's an image, set the block width to 2*1280/12 and position image on the left
  const hasImage = block.querySelector('img') !== null;
  if (hasImage) {
    let imageWidth = (2 * 1280) / 12;
    imageWidth = imageWidth + 156;
    wrapper.style.width = imageWidth + 'px';

    // Get the image
    const image = block.querySelector('img');

    // Set image width to 100px and move it to the beginning
    image.style.width = '100px';
    image.style.height = 'auto';
    image.style.flexShrink = '0';
    image.style.position = 'absolute';

    // Move the image to be the first child (leftmost position)
    block.insertBefore(image, block.firstChild);

    // Find button-container's parent and give it a class name
    const buttonContainer = block.querySelector('.button-container');
    if (buttonContainer && buttonContainer.parentElement) {
      buttonContainer.parentElement.classList.add('discover-content-with-image');
    }
  } else if (width) {
    // if data-width exists, override the default width with the data-width.
    wrapper.style.width = width;
  }

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    // Check if block has image and add class to heading if it does
    if (hasImage) {
      heading.classList.add('discover-heading-with-image');
    }
    const headingClone = heading.cloneNode(true);

    // Insert heading before the wrapper
    wrapper.parentElement.insertBefore(headingClone, wrapper);

    // Remove the original heading from the block content
    heading.remove();
  }
}
