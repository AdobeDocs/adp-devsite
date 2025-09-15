import { removeEmptyPTags, decorateButtons, createTag } from '../../scripts/lib-adobeio.js';

const CENTERED_VARIANTS = ['centered', 'centeredxl'];

/**
 * decorates the superhero
 * @param {Element} block The superhero block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'superhero');

  const main = document.querySelector('main');
  const isDevBiz = main.classList.contains('dev-biz');
  const isDevDocs = main.classList.contains('dev-docs');

  if (isDevBiz && hasAnyClass(block, CENTERED_VARIANTS)) {
    decorateDevBizCentered(block);
  }
}

function hasAnyClass(block, classes) {
  return classes.some((c) => block.classList.contains(c));
}

async function decorateDevBizCentered(block) {
  removeEmptyPTags(block);
  decorateButtons(block);

  const button_div = createTag('div', { class: 'hero-button-container' });

  block.classList.add('spectrum--dark');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
    h.style.color = 'white';
    h.parentElement.classList.add('superhero-content');
    h.parentElement.append(button_div);
  });

  block.querySelectorAll('p').forEach((p) => {
    const hasLinks = p.querySelectorAll('a, button');
    // don't attach to icon container or if p tag contains links
    if (!p.classList.contains('icon-container')) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
      p.style.color = 'white';
    }
    if (p.classList.contains('button-container')) {
      button_div.append(p);
    }
  });
}
