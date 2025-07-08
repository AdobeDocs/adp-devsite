import { createTag } from "../../scripts/lib-adobeio.js";

/**
 * decorates the discover block
 * @param {Element} block The discover block element
 */
export default async function decorate(block) {
   block.setAttribute('daa-lh', 'discover');

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

    // Add anchor link if it's h2 or h3
    if (headingClone.tagName === 'H2' || headingClone.tagName === 'H3') {
      const headingText = headingClone.textContent.trim();
      const anchorId = headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      // Add id to the heading
      headingClone.id = anchorId;

      // Create anchor link
      const anchorLink = createTag('a', {
        class: 'anchor-link spectrum-Link spectrum-Link--quiet',
        href: `#${anchorId}`,
        'aria-label': headingText
      });

      // Add anchor link icon
      anchorLink.innerHTML = `
        <svg aria-hidden="true" height="18" viewBox="0 0 16 16" width="18">
          <path d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path>
        </svg>
      `;

      // Add anchor link to heading
      headingClone.appendChild(anchorLink);
    }

    // Insert heading before the wrapper
    wrapper.parentElement.insertBefore(headingClone, wrapper);

    // Remove the original heading from the block content
    heading.remove();
  }
}
