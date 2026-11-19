const PRESETS = { small: '300px', medium: '500px', large: '600px' };
const LENGTH_RE = /^(?!0+(\.0+)?(px|%|rem)$)\d+(\.\d+)?(px|%|rem)$/;

function isMaxWidthRow(row) {
  if (row.children.length !== 2) return false;
  return row.firstElementChild.textContent.trim().toLowerCase().replace(/\s+/g, '-') === 'max-width';
}

function resolveMaxWidth(value) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (Object.hasOwn(PRESETS, trimmed)) return PRESETS[trimmed];
    if (LENGTH_RE.test(trimmed)) return trimmed;
  }
  // eslint-disable-next-line no-console
  console.warn('Image: unsupported maxWidth', value);
  return undefined;
}

export default function decorate(block) {
  const configRow = [...block.children].reverse().find(isMaxWidthRow);
  const value = block.getAttribute('data-maxwidth') ?? configRow?.lastElementChild.textContent;
  const maxWidth = resolveMaxWidth(value);

  [...block.children].forEach((row) => {
    if (isMaxWidthRow(row)) row.remove();
  });

  if (!block.querySelector('img')) {
    // eslint-disable-next-line no-console
    console.warn('Image: no image found');
  }
  if (maxWidth) block.style.setProperty('--image-max-width', maxWidth);
}
