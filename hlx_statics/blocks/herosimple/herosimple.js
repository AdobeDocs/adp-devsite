import {
  createTag,
} from '../../scripts/lib-adobeio.js';

/**
 * decorates the herosimple
 * @param {Element} block The herosimple block element
 */
export default async function decorate(block) {

  const backgroundColor = block.getAttribute('data-background') || 'rgb(29, 125, 238)';
  block.style.backgroundColor = backgroundColor;

  block.setAttribute('daa-lh', 'hero');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const fontFamily = block?.parentElement?.parentElement?.getAttribute('data-font-family');
    const headerFontSize = block?.parentElement?.parentElement?.getAttribute('data-HeaderFontSize');
    if (fontFamily) {
      h.style.fontFamily = fontFamily;
      h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
    } else if (headerFontSize) {
      h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL');
      h.style.fontSize = headerFontSize;
    } else {
      h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL', 'spectrum-Heading');
    }

  });

  // arrange divs
  let firstDiv = block.firstElementChild;
  let secondDiv = block.lastElementChild;

  let wrapperDiv = createTag('div');
  wrapperDiv.appendChild(firstDiv);
  wrapperDiv.appendChild(secondDiv);

  block.appendChild(wrapperDiv);

  // second child inner div make it a p
  let descriptionP = secondDiv.innerText;
  let descriptionPElement = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL' });
  descriptionPElement.innerText = descriptionP;

  secondDiv.replaceWith(descriptionPElement);
  // Paragraph decoration
  block.querySelectorAll('p').forEach((p) => {
    if (p.innerText) {
      p.classList.add('spectrum-Body', 'spectrum-Body--sizeL');
    }
  });
  const sourceElement = block.querySelector('source[type="image/webp"]');
  const srcsetValue = sourceElement ? sourceElement?.getAttribute('srcset') : null;
  const url = srcsetValue?.split(' ')[0];
  const imgElement = block.querySelector('img');
  const heroFirstDiv = block.querySelector('.herosimple > div');
  const heroSecondDiv = block.querySelector('.herosimple > div:nth-of-type(2)');
  if (srcsetValue) {
    imgElement.style.display = 'none';
    heroFirstDiv.style.marginBottom = '0px';
    heroSecondDiv.style.marginTop = '0px';
    Object.assign(block.style, {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    });
  }

  const heroSimpleContainer = document.querySelector('.herosimple-container');
  const sideNav = document.querySelector('.side-nav-container');
    if (heroSimpleContainer) {
      heroSimpleContainer.style.margin = '0px';
      heroSimpleContainer.style.maxWidth = 'none';
      const subParent = createTag('div',{class:'sub-parent'});
      const children = Array.from(heroSimpleContainer.children);
      children.forEach(child => {
        if (!child.classList.contains('herosimple-wrapper')) {
          subParent.appendChild(child);
        }
      });
      const herosimpleWrapper = block?.parentElement;
      if (herosimpleWrapper) {
        heroSimpleContainer.insertBefore(subParent, herosimpleWrapper.nextSibling);
      } else {
        heroSimpleContainer.appendChild(subParent);
      }
      subParent.style.margin = '0 164px';
      subParent.style.maxWidth = '1280px';
    }
    if(!sideNav){
      const heroSimpleDiv = block.querySelector('.herosimple > div');
      heroSimpleDiv.style.setProperty('max-width', '1280px', 'important');
    }
}