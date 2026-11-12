import {
  decorateButtons,
  removeEmptyPTags,
  rearrangeHeroPicture,
} from '../../scripts/lib-adobeio.js';



export default async function decorate(block) {
  block.setAttribute('daa-lh', 'summary');
  decorateButtons(block);
  removeEmptyPTags(block);
  block.classList.add('spectrum--dark');
  if (!block.querySelector('picture')) {
    // when there is no image, the width will be the whole width.
    block.classList.add('no-image');
    // make background to be default to light gray.
    if (!block.classList.contains('background-color-white') && !block.classList.contains('background-color-navy') && !block.classList.contains('background-color-dark-gray')) {
      block.classList.add('background-color-gray');
    }

    let outerDiv = block.querySelector('.no-image > div');
    let innerDiv = outerDiv.firstElementChild;
    if (outerDiv) {
      outerDiv.replaceWith(innerDiv); // Replace outer div with its inner div
    }
  }

  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    heading.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL');
  });

  const buttonParagraphs = [];

  block.querySelectorAll('p').forEach((p) => {
    const hasLinks = p.querySelectorAll('a, button');
    // don't attach to icon container or if p tag contains links
    if (!p.classList.contains('icon-container') && hasLinks.length === 0) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
    } else if (hasLinks.length > 0) {
      p.classList.remove('button-container');
      buttonParagraphs.push(p);
    }
    hasLinks.forEach((button) => {
      const isPrimaryButton = block.classList.contains('primarybutton') || button.classList.contains('spectrum-Button--fill');
      button.className = '';
      // Keep bold primary links filled with accent styling; default plain links to secondary button.
      if (isPrimaryButton) {
        button.classList.add('spectrum-Button', 'spectrum-Button--fill', 'spectrum-Button--accent', 'spectrum-Button--sizeM');
      } else {
        button.classList.add('spectrum-Button', 'spectrum-Button--secondary', 'spectrum-Button--sizeM', 'spectrumButton--overBackground', 'spectrum-Button--outline');
        if (!block.classList.contains('background-color-gray') && !block.classList.contains('background-color-white')) {
          button.classList.add('spectrum-Button--staticWhite');
        }
      }
    });
  });

  if (buttonParagraphs.length > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('summary-button-container');
    buttonParagraphs[0].before(buttonContainer);
    buttonParagraphs.forEach((p) => buttonContainer.append(p));
  }

  if (block.querySelector('picture')) {
    //if there is an image as the background set up the overlay style
    const overlayStyle = 'position: absolute; display: flex; z-index: 1000;';
    rearrangeHeroPicture(block, overlayStyle);
  }


}
