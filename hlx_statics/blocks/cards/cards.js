import { createTag, decorateButtons } from '../../scripts/lib-adobeio.js';
import { createOptimizedPicture, decorateLightOrDark } from '../../scripts/lib-helix.js';

/**
 * Generates optimized images for all cards in the block
 * @param {*} block The cards block
 */
function processImages(block) {
  block.querySelectorAll('picture > img').forEach((img) => {
    const parent = img.parentElement.parentElement;
    const imgSrc = img?.src;
    const altText = img?.alt;
    const picture = createOptimizedPicture(imgSrc, altText);
    parent.replaceChild(picture, img.parentElement);
  });
}

/**
 * loads and decorates the cards
 * @param {Element} block The cards block element
 */
export default async function decorate(block) {
  // by default, we will use all links as button.  When the section metadata added a linkstyle to be link, it'll change that section's button to be link.
  const isLink = block.classList.contains("links");
  if (!isLink) {
    decorateButtons(block);
  }

  if (block.getAttribute('data-wide') === 'true') {
    block.classList.add('wide');
  }

  // for devdocs, the author can put in an attribute width to change the width of the cards.
  const width = block.getAttribute('data-width');
  if (width) {
    const wrapper = block.closest('.cards-wrapper');
    if (wrapper) {
      wrapper.style.width = width;
    }
  }


  block.setAttribute('daa-lh', 'cards');
  block.querySelectorAll('.cards > div').forEach((card, index, array) => {

    decorateLightOrDark(block);

    card.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((header) => {
      header.classList.add('spectrum-Heading', 'spectrum-Heading--sizeM', 'card-heading');
    });

    card.querySelectorAll('p').forEach((p) => {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    });

    if (isLink) {
      card.querySelectorAll('p > a').forEach((a) => {
        a.classList.add('spectrum-Link', 'spectrum-Button--secondary');
      });
    } else {
      const buttonPs = [...card.querySelectorAll('p > a')].map((a) => {
        a.classList.remove('spectrum-Button--secondary', 'spectrum-Button--outline');
        a.classList.add('spectrum-Button--accent', 'spectrum-Button--fill', 'spectrum-Button', 'card-button');
        return a.parentElement;
      });

      if (buttonPs.length > 1) {
        const buttonWrap = createTag('div', { class: 'cards-button-container' });
        buttonPs.forEach((p, key) => {
          if (key === 0) {
            p.previousElementSibling?.insertAdjacentElement('afterend', buttonWrap);
          }
          buttonWrap.appendChild(p);
        });
      }
    }

    if (array.length === 3) {
      card.classList.add('three-card');
    } else if (array.length === 4) {
      card.classList.add('four-card');
    }

  });

  Array.from(block.querySelectorAll('div')).forEach((div) => {
    if(div.textContent.trim() !== '') {
      div.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
    }
  });

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      processImages(block);
    }
  });
  observer.observe(block);
}
