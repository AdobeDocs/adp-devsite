import { decorateButtons, removeEmptyPTags } from '../../scripts/lib-adobeio.js';
import { getMetadata } from '../../scripts/scripts.js';

/**
 * @param {Element} block
 */
function rearrangeLinks(block) {
  let variant = block.getAttribute('data-variant');

  let leftDiv = block.firstElementChild.firstElementChild;
  if (getMetadata('template') === 'documentation') {
    leftDiv = block.lastElementChild.lastElementChild;
  }
  const announcementButtonContainer = document.createElement('div');
  announcementButtonContainer.classList.add('announcement-button-container');

  leftDiv.querySelectorAll('ul').forEach((ul) => {
    ul.querySelectorAll('li a').forEach((a, index) => {
      const pTag = document.createElement('p');
      if (index === 0 && variant !== 'secondary') {
        const strong = document.createElement('strong');
        strong.append(a.cloneNode(true));
        pTag.append(strong);
      } else {
        pTag.append(a);
      }
      announcementButtonContainer.append(pTag);
      decorateButtons(pTag);
    });
    ul.remove();
  });

  leftDiv.querySelectorAll('p.button-container').forEach((p) => {
    announcementButtonContainer.append(p);
  });

  leftDiv.append(announcementButtonContainer);
}


/**
 * @param {Element} block
 */
function setBackgroundImage(block) {
  const img = block.querySelector('picture img');

  if (img) {
    const announcementWrapper = block.closest('.announcement-wrapper');
    const imgParent = img.closest('picture').parentElement;
    Object.assign(announcementWrapper.style, {
      backgroundImage: `url('${img.src}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '4% 0%'
    });
    imgParent.style.display = 'none';
  }
}

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  const backgroundColor = block.getAttribute("data-backgroundcolor");
  block.setAttribute('daa-lh', 'announcement');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'announcement-heading');
    h.style.whiteSpace = "normal";
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
    p.style.whiteSpace = "normal";
  });
  const imageExists = block.querySelector('picture img');
  const allowedBackgroundColors = ["background-color-white", "background-color-navy", "background-color-dark-gray"];
  if (!imageExists) {
    if (getMetadata("template") === "documentation" && Boolean(backgroundColor) && allowedBackgroundColors.includes(backgroundColor)) {
      block.classList.add(backgroundColor);
    } else if (!allowedBackgroundColors.includes(backgroundColor) && getMetadata("template") === "documentation") {
      block.classList.add("background-color-gray");
    } else {
      block.classList.add("background-color-white");
    }
  }
  decorateButtons(block);
  removeEmptyPTags(block);
  rearrangeLinks(block);
  setBackgroundImage(block);
}
