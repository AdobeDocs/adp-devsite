import { removeEmptyPTags, decorateButtons, createTag } from '../../scripts/lib-adobeio.js';
import { decorateLightOrDark } from '../../scripts/lib-helix.js';

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
      });
    });
  } else {
    // insert a placeholder div (where the background image would be), because it is styled as the space between the text and the image/video.
    const emptyDiv = createTag('div');
    const emptyInnerDiv = createTag('div');
    emptyDiv.appendChild(emptyInnerDiv);
    block.insertBefore(emptyDiv, block.lastElementChild);
  }

  heroWrapper.querySelectorAll('.superhero-container > div > div').forEach((herowrapper) => {
    Object.assign(herowrapper.style, {
      width: '75%',
      margin: 'auto',
    });
  });

  const videoURL = block.lastElementChild.querySelector('a');
  if (videoURL && block.classList.contains('video')) {
    const videoContainer = createTag('div', { class: 'superhero-video-container' });
    const videoTag = `<video src=${videoURL?.href} alt=${videoURL?.textContent} autoplay playsinline muted loop></video>`;
    videoContainer.innerHTML = videoTag;
    block.lastElementChild.replaceWith(videoContainer);
  }
}

async function decorateDevBizDefault(block) {}

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
  block.style.background = background;
  const wrapper = block.parentElement;
  wrapper.style.background = background;

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
