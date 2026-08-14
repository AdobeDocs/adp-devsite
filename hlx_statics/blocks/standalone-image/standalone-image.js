/**
 * Marks the second row of the block as the caption, gives it a unique id,
 * and links it to the image via aria-labelledby.
 * The caption is hidden by default (see standalone-image.css).
 * @param {Element} block The standalone-image block element
 */
function decorateCaption(block) {
  const rows = block.querySelectorAll(':scope > div');
  if (rows.length < 2) return;

  const caption = rows[1].firstElementChild;
  if (!caption) return;

  caption.classList.add('caption');

  const captionId = `image-caption-${Math.random().toString(36).slice(2, 10)}`;
  caption.id = captionId;

  const img = rows[0].querySelector('img');
  if (img) {
    img.setAttribute('aria-labelledby', captionId);
  }
}

/**
 * Decorates the standalone-image block.
 * @param {Element} block The standalone-image block element
 */
export default function decorate(block) {
  block.setAttribute('daa-lh', 'standalone-image');
  decorateCaption(block);
}