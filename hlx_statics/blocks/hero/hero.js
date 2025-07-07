import {
  decorateButtons,
  removeEmptyPTags,
  createTag,
} from '../../scripts/lib-adobeio.js';
import { decorateLightOrDark } from '../../scripts/lib-helix.js';

/**
 * Rearranges the links into a hero-button-container div
 * @param {*} block The hero block element
 */
function rearrangeLinks(block) {
  const leftDiv = block.firstElementChild.firstElementChild;
  const heroButtonContainer = document.createElement('div');
  heroButtonContainer.classList.add('hero-button-container');
  leftDiv.querySelectorAll('p.button-container').forEach((p) => {
    heroButtonContainer.append(p);
  });
  leftDiv.append(heroButtonContainer);
}

/**
 * decorates the hero
 * @param {Element} block The hero block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'hero');
  if(block.classList.contains('halfwidth')) {
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
      heroWrapper.querySelectorAll('.hero-container > div').forEach((herowrapper) => {
        Object.assign(herowrapper.style, {
          backgroundImage: `url(${picsrc})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        });
      });
      heroWrapper.querySelectorAll('.hero-container > div > div').forEach((herowrapper) => {
        Object.assign(herowrapper.style, {
          backgroundColor: 'transparent',
          width: '75%',
          margin: 'auto',
        });
      });
    }
  } else if(block.classList.contains('site') || block.classList.contains('site-xl')) {
    removeEmptyPTags(block);
    decorateButtons(block);
  
    const button_div = createTag('div', {class: 'hero-button-container'});
  
    block.classList.add('spectrum--dark');
    block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
      h.style.color = "white";
      h.parentElement.classList.add('hero-content');
      h.parentElement.append(button_div);
    });
  
    block.querySelectorAll('p').forEach((p) => {
      const hasLinks = p.querySelectorAll('a, button');
      // don't attach to icon container or if p tag contains links
      if (!p.classList.contains('icon-container')) {
        p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
        p.style.color = "white";
      }
      if (p.classList.contains('button-container')){
        button_div.append(p);
      }
    });
  }
}
