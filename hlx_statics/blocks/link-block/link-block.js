import { createTag} from '../../scripts/lib-adobeio.js';

/**
 * decorates the link block component
 * @param {Element} block link block component
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'link-block');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'title-heading');
  });
  const icon = `<svg xmlns='http://www.w3.org/2000/svg' height="18" viewBox="0 0 18 18" width="18"><defs><style>.fill {fill: #464646;}</style> </defs><title>S LinkOut 18 N</title><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M16.5,9h-1a.5.5,0,0,0-.5.5V15H3V3H8.5A.5.5,0,0,0,9,2.5v-1A.5.5,0,0,0,8.5,1h-7a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5v-7A.5.5,0,0,0,16.5,9Z" /><path class="fill" d="M16.75,1H11.377A.4.4,0,0,0,11,1.4a.392.392,0,0,0,.1175.28l1.893,1.895L9.4895,7.096a.5.5,0,0,0-.00039.70711l.00039.00039.707.707a.5.5,0,0,0,.707,0l3.5215-3.521L16.318,6.882A.39051.39051,0,0,0,16.6,7a.4.4,0,0,0,.4-.377V1.25A.25.25,0,0,0,16.75,1Z" /></svg>`
  block.querySelectorAll('li').forEach((li) => {
    li.querySelectorAll('a').forEach((a) => {
      // get rid of empty anchor tags
      if (!a.hasChildNodes()) {
        a.remove();
      }
    });
    li.classList.add('spectrum-Body', 'spectrum-Body--sizeL', 'link-icon');
    const division = createTag('div');
    division.innerHTML=icon;
    li.append(division);
  });
  
  const subParent = document.querySelector('.sub-parent');
      const linkBlockWrapper = document.querySelector('.link-block-wrapper');
      if (linkBlockWrapper) {
          const linkBlockDiv = createTag('div', { class: 'linkblock-container' });
          linkBlockWrapper.parentNode.insertBefore(linkBlockDiv, linkBlockWrapper);
          linkBlockDiv.appendChild(linkBlockWrapper);
          const relatedBlocksDiv = createTag('div', { class: 'relatedBlocksDiv' });
          Array.from(subParent.children).forEach(child => {
              if (!child.classList.contains('linkblock-container')) {
                relatedBlocksDiv.appendChild(child);
              }
          });
          subParent.appendChild(relatedBlocksDiv);
          subParent.style.display = 'flex';
          subParent.style.flexDirection = 'row-reverse';
  }
}
