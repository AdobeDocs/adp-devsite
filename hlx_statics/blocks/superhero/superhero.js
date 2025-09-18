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
  } else if (isDevDocs && hasAnyVariant(block, CENTERED_VARIANTS)) {
    rearrangeAsDevBizCentered(block);
    decorateDevBizCentered(block);
    applyDataAttributeStyles(block);
  }
}

function hasAnyClass(block, classes) {
  return classes.some((c) => block.classList.contains(c));
}

function hasAnyVariant(block, variants) {
  const variant = block.getAttribute('data-variant') || 'default';
  return variants.some((v) => v === variant);
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
    if (!p.classList.contains('icon-container')) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
      p.style.color = 'white';
    }
    if (p.classList.contains('button-container')) {
      button_div.append(p);
    }
  });
}

function rearrangeAsDevBizCentered(block) {
  const slotNames = block
    ?.getAttribute('data-slots')
    ?.split(',')
    .map((slot) => slot.trim());

  const children = Array.from(block.children[0].children);
  const slotElements = Object.fromEntries(slotNames.map((slotName, index) => [slotName, children[index]]));

  const headingContent = slotElements.heading?.querySelector('h1, h2, h3, h4, h5, h6');
  const textContent = slotElements.text?.firstChild;
  const buttonsContent = slotElements.buttons?.querySelectorAll('ul > li > a');
  const imageContent = slotElements.image?.querySelector('picture > img');

  const newChildren = [];
  
  const contentDiv = createTag('div');
  const contentInnerDiv = createTag('div');
  
  if (headingContent) {
    contentInnerDiv.appendChild(headingContent);
  }
  
  if (textContent) {
    const p = createTag('p');
    p.textContent = textContent.textContent;
    contentInnerDiv.appendChild(p);
  }
  
  if (buttonsContent) {
    buttonsContent.forEach((button, index) => {
      const p = createTag('p', { class: 'button-container' });
      if (index === 0) {
        const strong = createTag('strong');
        strong.appendChild(button);
        p.appendChild(strong);
      } else {
        p.appendChild(button);
      }
      contentInnerDiv.appendChild(p);
    });
  }
  
  contentDiv.appendChild(contentInnerDiv);
  newChildren.push(contentDiv);
  
  const imageDiv = createTag('div');
  const imageInnerDiv = createTag('div');
  
  if (imageContent) {
    const picture = createTag('picture');
    picture.appendChild(imageContent);
    imageInnerDiv.appendChild(picture);
  }
  
  imageDiv.appendChild(imageInnerDiv);
  newChildren.push(imageDiv);
  
  block.replaceChildren(...newChildren);
}

function applyDataAttributeStyles(block) {
  const background = block.getAttribute('data-background') || 'rgb(29, 125, 238)';
  block.style.background = background;

  const textColor = block.getAttribute('data-textcolor') || 'white';
  const allowedTextColors = ['black', 'white', 'gray', 'navy'];
  if(allowedTextColors.includes(textColor)) {
    block.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
      el.style.color = textColor;
    });
  }
}

