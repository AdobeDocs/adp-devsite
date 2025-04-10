import { createTag } from "../../scripts/lib-adobeio.js";

/**
 * decorates the title
 * @param {Element} block The title block element {Parameter Type} Name of the Parameter
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'discover');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS', 'title-heading');
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
  });
  // block.parentElement.style.display = 'flex';
  // block.parentElement.style.justifyContent = 'center';
  // const position = block?.parentElement?.parentElement?.getAttribute('data-position');
  // if(position) {
  //   const discoverPosition = document.querySelector('.discover-wrapper');
  //   discoverPosition.style.justifyContent = position;   
  // }

  const width = block.getAttribute('data-width')
  if(width === '100%'){
    block.classList.add('discoverblock-column');
  }else {
    let existingWrapper = document.querySelector('.discoverblock-container-wrapper') || null;
    if (!existingWrapper) {
      existingWrapper = createTag('div', { class: 'discoverblock-container-wrapper' });
      const parentElement = block.parentElement;
      parentElement.appendChild(existingWrapper);
    }
    existingWrapper.appendChild(block);
    const firstHeading = existingWrapper.querySelector('h2, h3');
    if (firstHeading) {
      Array.from(existingWrapper.children).forEach((child,index) => {
        if(index > 0) {
          child.style.marginTop = '35px';
        } 
      });
    }
    const children = Array.from(existingWrapper.children);
    children.forEach(child => {
      child.style.maxWidth = '290px';
    });
    const discoverBlocks = document.querySelectorAll('.discoverblock-wrapper');
    discoverBlocks.forEach(div => {
      if (div.childElementCount === 0) {
        div.remove();
      }
    });
  }
  
  Array.from(block.children).forEach(div => {
    const containsHeading = div.querySelector('h1, h2, h3, h4, h5, h6') !== null;
    if (containsHeading) {
      var breakDiv = createTag('div', { class: 'break' });

      block.insertBefore(breakDiv, div);
    }
    else {
      div.classList.add('discover-nonheading-child-container')
    }

    div.classList.add('discover-child-container')

    if (div?.firstElementChild?.firstElementChild?.querySelector('img')) {
      const newDiv = document.createElement('div');

      Array.from(div.firstElementChild.children).forEach((ele, index) => {
        if (index > 0) {
          newDiv.append(ele)
        }
      })

      div.firstElementChild.append(newDiv);
      div.firstElementChild.classList.add('discover-child-inner-container')
      div.classList.add('discover-img-child-container')
    }
  })
}