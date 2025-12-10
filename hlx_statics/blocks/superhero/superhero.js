import { removeEmptyPTags, decorateButtons, createTag } from '../../scripts/lib-adobeio.js';
import { decorateLightOrDark } from '../../scripts/lib-helix.js';
import { insertWrapperChild } from '../../components/wrapperContainer.js';

const VARIANTS = {
  default: 'default',
  centered: 'centered',
  centeredXL: 'centered-xl',
  halfWidth: 'half-width',
};

const TEXT_COLORS = {
  black: 'black',
  white: 'white',
  gray: 'gray',
  navy: 'navy',
};

/**
 * decorates the superhero
 * @param {Element} block The superhero block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'superhero');

  const main = document.querySelector('main');
  const isDevDocs = main.classList.contains('dev-docs');

  if (isDevDocs) {
    restructureAsDevBiz(block);
    applyDataAttributeStyles(block);
  }

  if (hasAnyClass(block, [VARIANTS.centered, VARIANTS.centeredXL])) {
    decorateDevBizCentered(block);
  } else if (hasAnyClass(block, [VARIANTS.halfWidth])) {
    decorateDevBizHalfWidth(block);
  } else {
    block.classList.add(VARIANTS.default);
    decorateDevBizDefault(block);
  }
}

function hasAnyClass(block, classes) {
  return classes.some((c) => block.classList.contains(c));
}

async function decorateDevBizCentered(block) {
  const defaultTextColor = TEXT_COLORS.white;

  removeEmptyPTags(block);
  decorateButtons(block);

  const button_div = createTag('div', { class: 'superhero-button-container' });

  block.classList.add('spectrum--dark');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
    h.style.color = defaultTextColor;
    h.parentElement.classList.add('superhero-content');
    h.parentElement.append(button_div);
  });

  block.querySelectorAll('p').forEach((p) => {
    if (!p.classList.contains('icon-container')) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
      p.style.color = defaultTextColor;
    }
    if (p.classList.contains('button-container')) {
      button_div.append(p);
    }
  });
}

async function decorateDevBizHalfWidth(block) {
  insertWrapperChild(block);

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

  // Removes content for span.icon and unwraps from parent
  block.querySelectorAll('span.icon').forEach((span) => {
    span.textContent = '';

    const spanParent = span.parentElement;
    spanParent.replaceWith(span);
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
  const wrapper = block?.parentElement?.parentElement;

  if (backgroundImage) {
    const placeholderDiv = block.querySelector('div:nth-child(2)');
    const picSrc = placeholderDiv.querySelectorAll('picture img')[0].currentSrc;
    Object.assign(wrapper.style, {
      backgroundImage: `url(${picSrc})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    });
    placeholderDiv.remove();
  }
  
  const videoURL = block.lastElementChild.querySelector('a');
  if (videoURL && block.classList.contains('video')) {
    const videoContainer = createTag('div', { class: 'superhero-video-container' });
    const videoTag = `<video src=${videoURL?.href} alt=${videoURL?.textContent} autoplay playsinline muted loop></video>`;
    videoContainer.innerHTML = videoTag;
    block.lastElementChild.replaceWith(videoContainer);
  }
}

async function decorateDevBizDefault(block) {
  const newChildren = [];

  const pictureContent = block.querySelector('div:nth-child(2) > div > picture');
  const headingContent = block.querySelector('div:nth-child(1) > div > h1');
  const textContent = block.querySelector('div:nth-child(1) > div > p:first-of-type');
  const buttonsContent = block.querySelectorAll('div:nth-child(1) > div > p.button-container');

  if (pictureContent) {
    const pictureDiv = createTag('div');
    pictureDiv.appendChild(pictureContent);
    newChildren.push(pictureDiv);
  }

  if (headingContent) {
    const headingDiv = createTag('div');
    headingDiv.appendChild(headingContent);
    newChildren.push(headingDiv);
  }

  if (textContent) {
    const textDiv = createTag('div');
    textDiv.innerHTML = textContent.innerHTML;
    newChildren.push(textDiv);
  }

  if (buttonsContent?.length > 0) {
    const buttonsDiv = createTag('div');
    buttonsContent.forEach((button) => {
      buttonsDiv.appendChild(button);
    });
    newChildren.push(buttonsDiv);
  }

  const div = createTag('div');
  div.append(...newChildren);
  block.replaceChildren(div);

  const defaultTextColor = TEXT_COLORS.white;
  let textColor = Object.values(TEXT_COLORS).find((color) => block.classList.contains(`text-color-${color}`)) ?? defaultTextColor;
  block.classList.add(`text-color-${defaultTextColor}`);

  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.style.color = textColor;
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL', 'spectrum-Heading');
  });

  const img = block.querySelector('picture > img');
  const url = img?.getAttribute('src');
  const pictureElement = block.querySelector('picture');

  const parentDiv = pictureElement?.parentElement;
  if (parentDiv) parentDiv.remove();

  const existingBackground = block.style.background;
  const backgroundLayers = [
    `url(${url}) center center / cover no-repeat`,
    existingBackground,
  ].filter(Boolean);
  block.style.background = backgroundLayers.join(', ');

  normalizeButtonContainer(block);
  decorateButtons(block);
}

/**
 * restructures a DevDocs block to match DevBiz before the decorate function runs
 */
function restructureAsDevBiz(block) {
  const camelCaseVariant = block.getAttribute('data-variant') || VARIANTS.default;
  if (camelCaseVariant in VARIANTS) {
    const kebabCaseVariant = VARIANTS[camelCaseVariant];
    block.setAttribute('data-variant', kebabCaseVariant);
    block.classList.add(kebabCaseVariant);
  }

  const textColor = block.getAttribute('data-textcolor');
  if (textColor) {
    block.classList.add(`text-color-${textColor}`);
  }

  if (block.getAttribute('data-overgradient')) {
    block.classList.add('over-gradient');
  }
  const slotNames = block
    ?.getAttribute('data-slots')
    ?.split(',')
    .map((slot) => slot.trim());

  if (slotNames.includes('fullWidthBackground')) {
    block.classList.add('full-width-background');
  }

  if (slotNames.includes('video')) {
    block.classList.add('video');
  }

  const children = Array.from(block.children[0].children);
  const slotElements = Object.fromEntries(slotNames.map((slotName, index) => [slotName, children[index]]));

  const iconContent = slotElements.icon?.firstElementChild;
  const headingContent = slotElements.heading?.querySelector('h1, h2, h3, h4, h5, h6');
  const textContent = slotElements.text;
  const buttonsContent = slotElements.buttons?.querySelectorAll('ul > li > a');
  const backgroundContent = slotElements.fullWidthBackground?.querySelector('picture > img');
  const imageContent = slotElements.image?.querySelector('picture > img');
  const videoContent = slotElements.video;

  const newChildren = [];

  const contentDiv = createTag('div');
  const contentInnerDiv = createTag('div');

  if (iconContent) {
    contentInnerDiv.appendChild(iconContent);
  }

  if (headingContent) {
    contentInnerDiv.appendChild(headingContent);
  }

  if (textContent) {
    const p = createTag('p');
    p.innerHTML = textContent.innerHTML;
    contentInnerDiv.appendChild(p);
  }

  if (buttonsContent?.length > 0) {
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

  if (contentInnerDiv.children.length > 0) {
    contentDiv.appendChild(contentInnerDiv);
    newChildren.push(contentDiv);
  }

  const backgroundDiv = createTag('div');
  const backgroundInnerDiv = createTag('div');

  if (backgroundContent) {
    const picture = createTag('picture');
    picture.appendChild(backgroundContent);
    backgroundInnerDiv.appendChild(picture);
  }

  if (backgroundInnerDiv.children.length > 0) {
    backgroundDiv.appendChild(backgroundInnerDiv);
    newChildren.push(backgroundDiv);
  }

  const mediaDiv = createTag('div');

  if (imageContent) {
    const mediaInnerDiv = createTag('div');
    const picture = createTag('picture');
    picture.appendChild(imageContent);
    mediaInnerDiv.appendChild(picture);
    mediaDiv.appendChild(mediaInnerDiv);
  }

  if (videoContent) {
    mediaDiv.appendChild(videoContent);
  }

  if (mediaDiv.children.length > 0) {
    newChildren.push(mediaDiv);
  }

  block.replaceChildren(...newChildren);
}

function applyDataAttributeStyles(block) {
  const variant = block.getAttribute('data-variant') || VARIANTS.default;

  const defaultBackgroundColor = variant === VARIANTS.halfWidth ? 'rgb(255, 255, 255)' : 'rgb(29, 125, 238)';
  const background = block.getAttribute('data-background') || defaultBackgroundColor;
  if(variant === VARIANTS.halfWidth) {
    const wrapper = block.parentElement;
    wrapper.style.background = background;
  } else {
    block.style.background = background;
  }

  const defaultTextColor = variant === VARIANTS.halfWidth ? TEXT_COLORS.black : TEXT_COLORS.white;
  const textColor = block.getAttribute('data-textcolor') || defaultTextColor;
  if (Object.keys(TEXT_COLORS).includes(textColor)) {
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

function normalizeButtonContainer(block) {
  const anchorElement = Array.from(block.querySelectorAll('a'));
  if (anchorElement.length > 0) {
    const lastGroup = block.lastElementChild?.lastElementChild;
    if (lastGroup && [...lastGroup.children].every((child) => child.tagName === 'P')) {
      lastGroup.classList.add('all-button-container');
    }
  }
}
