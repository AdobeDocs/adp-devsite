import { removeEmptyPTags, decorateButtons, createTag } from '../../scripts/lib-adobeio.js';
import { decorateLightOrDark } from '../../scripts/lib-helix.js';

const DEFAULT_VARIANT = 'default';
const DEFAULT_BACKGROUND_COLOR = 'rgb(29, 125, 238)';
const DEFAULT_TEXT_COLOR = 'white';
const ALLOWED_TEXT_COLORS = ['black', DEFAULT_TEXT_COLOR, 'gray', 'navy'];

/**
 * decorates the superhero
 * @param {Element} block The superhero block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'superhero');

  const main = document.querySelector('main');
  const isDevBiz = main.classList.contains('dev-biz');
  const isDevDocs = main.classList.contains('dev-docs');

  if (isDevBiz && hasAnyClass(block, ['centered', 'centered-xl'])) {
    decorateDevBizCentered(block);
  } else if (isDevDocs && hasAnyVariant(block, ['centered', 'centeredXL'])) {
    restructureAsDevBizCentered(block);
    decorateDevBizCentered(block);
    applyDataAttributeStyles(block);
  } else if (isDevBiz && hasAnyClass(block, ['half-width'])) {
    decorateDevBizHalfWidth(block);
  }
}

function hasAnyClass(block, classes) {
  return classes.some((c) => block.classList.contains(c));
}

function hasAnyVariant(block, variants) {
  const variant = block.getAttribute('data-variant') || DEFAULT_VARIANT;
  return variants.some((v) => v === variant);
}

async function decorateDevBizCentered(block) {
  removeEmptyPTags(block);
  decorateButtons(block);

  const button_div = createTag('div', { class: 'superhero-button-container' });

  block.classList.add('spectrum--dark');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
    h.style.color = DEFAULT_TEXT_COLOR;
    h.parentElement.classList.add('superhero-content');
    h.parentElement.append(button_div);
  });

  block.querySelectorAll('p').forEach((p) => {
    if (!p.classList.contains('icon-container')) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
      p.style.color = DEFAULT_TEXT_COLOR;
    }
    if (p.classList.contains('button-container')) {
      button_div.append(p);
    }
  });
}

async function decorateDevBizHalfWidth(block) {
  block.setAttribute('daa-lh', 'superhero');
  // Block decoration
  decorateLightOrDark(block, true);
  // H1 decoration
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
  });

  block.querySelectorAll('picture source').forEach((picture) => {
    // Removes weird max-width attribute
    picture.media = '';
  });

  // Removes content for span.icon
  block.querySelectorAll('span.icon').forEach((span) => {
    span.textContent = '';
  });
  // Link decoration
  rearrangeLinks(block);
  decorateButtons(block);
  // Paragraph decoration
  block.querySelectorAll('p').forEach((p) => {
    if (p.innerText) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
    }
  });

  const backgroundImage = block.classList.contains('full-width-background');
  const heroWrapper = block?.parentElement?.parentElement;

  if (backgroundImage) {
    const picsrc = block.querySelectorAll('picture img')[0].currentSrc;
    heroWrapper.querySelectorAll('.superhero-container > div').forEach((herowrapper) => {
      Object.assign(herowrapper.style, {
        backgroundImage: `url(${picsrc})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      });
    });
    heroWrapper.querySelectorAll('.superhero-container > div > div').forEach((herowrapper) => {
      Object.assign(herowrapper.style, {
        backgroundColor: 'transparent',
        width: '75%',
        margin: 'auto',
      });
    });
  }

  const videoURL = block.lastElementChild.querySelector('a');
  if (videoURL && block.classList.contains('video')) {
    const videoContainer = createTag('div', { class: 'superhero-video-container' });
    const videoTag = `<video src=${videoURL?.href} alt=${videoURL?.textContent} autoplay playsinline muted loop></video>`;
    videoContainer.innerHTML = videoTag;
    block.lastElementChild.replaceWith(videoContainer);
  }
}

/**
 * restructures a devdocs block to match devbiz before the decorate function runs
 */
function restructureAsDevBizCentered(block) {
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
  const variant = block.getAttribute('data-variant') || DEFAULT_VARIANT;
  block.classList.add(variant);

  const background = block.getAttribute('data-background') || DEFAULT_BACKGROUND_COLOR;
  block.style.background = background;

  const textColor = block.getAttribute('data-textcolor') || DEFAULT_TEXT_COLOR;
  if (ALLOWED_TEXT_COLORS.includes(textColor)) {
    block.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
      el.style.color = textColor;
    });
  }
}

/**
 * Rearranges the links into a superhero-button-container div
 * @param {*} block The hero block element
 */
function rearrangeLinks(block) {
  const leftDiv = block.firstElementChild.firstElementChild;
  const heroButtonContainer = document.createElement('div');
  heroButtonContainer.classList.add('superhero-button-container');
  leftDiv.querySelectorAll('p.button-container').forEach((p) => {
    heroButtonContainer.append(p);
  });
  leftDiv.append(heroButtonContainer);
}
