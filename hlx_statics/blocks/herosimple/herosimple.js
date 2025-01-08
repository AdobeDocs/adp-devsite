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
  
  const sourceElement = block.querySelector('source[type="image/webp"]');
  const srcsetValue = sourceElement ? sourceElement?.getAttribute('srcset') : null;
  const url = srcsetValue?.split(' ')[0];
  const pictureElement = block.querySelector('picture');
  if(pictureElement){
    const parentDiv = pictureElement.parentElement;
    parentDiv.remove();
    Object.assign(block.style, {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    });
  }

  const heroSimpleContainer = document.querySelector('.herosimple-container');
  const sideNav = document.querySelector('.side-nav-container');
  const subParent = createTag('div',{class:'sub-parent'});
    if (heroSimpleContainer) {
      heroSimpleContainer.style.margin = '0px';
      heroSimpleContainer.style.maxWidth = 'none';
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
      subParent.style.margin = '0 auto';
      subParent.style.maxWidth = '1000px';
    }
    if(!sideNav){
      const heroSimpleDiv = block.querySelector('.herosimple > div');
      heroSimpleDiv.style.setProperty('max-width', '1280px', 'important');
      subParent.style.margin = '0 auto';
      subParent.style.maxWidth = '1280px';
    }
}