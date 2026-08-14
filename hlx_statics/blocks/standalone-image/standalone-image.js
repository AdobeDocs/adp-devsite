let captionId = 0;

/**
 * Marks the second row of the block as the caption, hides it,
 * and wires it to the image via aria-labelledby.
 * The caption is hidden by default (see standalone-image.css).
 * @param {Element} block The standalone-image block element
 */
function decorateCaption(block) {
  const rows = block.querySelectorAll(':scope > div');
  if (rows.length < 2) return;

  const caption = rows[1].firstElementChild;
  if (!caption) return;

  const img = rows[0].querySelector('img');
  if (!img) return;

  captionId += 1;
  const id = `standalone-image-caption-${captionId}`;

  caption.classList.add('caption');
  caption.id = id;
  img.setAttribute('aria-labelledby', id);
}

/**
 * Decorates the standalone-image block.
 * @param {Element} block The standalone-image block element
 */
export default function decorate(block) {
  block.setAttribute('daa-lh', 'standalone-image');
  decorateCaption(block);
}
