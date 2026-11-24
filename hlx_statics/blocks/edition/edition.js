const colorMap = {
  red: 'rgb(187, 2, 2)',
  green: 'rgb(0, 128, 0)',
  blue: 'rgb(4, 105, 227)',
  gray: 'rgb(71, 71, 71)',
};

function getBackgroundColor(block) {
  const requested = block.dataset.backgroundcolor
    || [...block.classList]
      .find((name) => name.startsWith('background-color-'))
      ?.replace('background-color-', '');
  return colorMap[requested?.toLowerCase()] || colorMap.red;
}

function decorateLink(anchor) {
  anchor.setAttribute('rel', 'noopener noreferrer');
  anchor.setAttribute('target', '_blank');
  anchor.removeAttribute('title');
}

// DevBiz authors the label and an optional link as separate paragraphs; merge
// them into one inline label. DevDocs authors plain text or a link directly.
function mergeParagraphs(cell) {
  const [label, linkParagraph] = cell.querySelectorAll(':scope > p');
  if (!label) return;

  const span = document.createElement('span');
  [...label.attributes].forEach(({ name, value }) => span.setAttribute(name, value));
  span.append(...label.childNodes);
  label.replaceWith(span);

  const anchor = linkParagraph?.querySelector('a');
  if (anchor) {
    span.append(anchor);
    linkParagraph.remove();
  }
}

export default async function decorate(block) {
  const backgroundColor = getBackgroundColor(block);

  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    Object.assign(cell.style, { backgroundColor, color: 'white', fontSize: '12px' });
    mergeParagraphs(cell);
    cell.querySelectorAll('a').forEach(decorateLink);
  });
}
