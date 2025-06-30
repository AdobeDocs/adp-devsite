import { createTag, decorateButtons } from "../../scripts/lib-adobeio.js";

/**
 * decorates the herosimple
 * @param {Element} block The herosimple block element
 */

function normalizeButtonContainer(block) {
  if(block.getAttribute('data-slots').split(' ').includes('buttons')){
    const anchorElement = Array.from(block.querySelectorAll('a'));
    if (anchorElement.length > 0) {
      anchorElement.forEach((anchor, i) => {
        const p = createTag('p');
        const node = i === 0 ? createTag('strong') : p;
        node.appendChild(anchor.cloneNode(true));
        p.appendChild(node === p ? node.firstChild : node);
        anchor.replaceWith(p);
      });
  
      const lastGroup = block.lastElementChild?.lastElementChild;
      if (lastGroup && [...lastGroup.children].every(child => child.tagName === 'P')) {
        lastGroup.classList.add('all-button-container');
      }
    }
  }
}

export default async function decorate(block) {
  const background = block.getAttribute('data-background') || 'rgb(29, 125, 238)';
  block.style.background = background;

  const variant = block.getAttribute('data-variant') || 'default';
  block.classList.add(variant);

  const textColor = block.getAttribute('data-textcolor') || 'white';
  block.classList.add(`text-color-${textColor}`);

  const layoutWrapper = createTag('div', { class: "herosimple-container-wrapper" });
  const contentContainer = createTag('div', { class: "hero-left-content" });
  const imageContainer = createTag('div', { class: "hero-right-image" });

  const allowedTextColors = { black: 'rgb(0, 0, 0)', white: 'rgb(255, 255, 255)', gray: 'rgb(110, 110, 110)', navy: 'rgb(15, 55, 95)' };

  block.setAttribute('daa-lh', 'hero');
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    h.style.color = Object.keys(allowedTextColors).includes(textColor) && allowedTextColors[textColor];
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeXXL', 'spectrum-Heading');
  });

  const sourceElement = block.querySelector('source[type="image/webp"]');
  const srcsetValue = sourceElement ? sourceElement?.getAttribute('srcset') : null;
  const url = srcsetValue?.split(' ')[0];
  const pictureElement = block.querySelector('picture');

  if (pictureElement && variant === "fullWidth" || variant === "default") {
    const parentDiv = pictureElement?.parentElement;

    if (parentDiv)
      parentDiv.remove();

    Object.assign(block.style, {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    });
  }

  else if (pictureElement && variant === "halfWidth") {
    const pictureWrapper = pictureElement.closest('div') || pictureElement;

    imageContainer.appendChild(pictureWrapper);

    Array.from(block.children).filter(div => !div.contains(pictureElement)).forEach(div => contentContainer.appendChild(div));

    block.innerHTML = '';
    layoutWrapper.append(contentContainer, imageContainer);
    block.appendChild(layoutWrapper);
  }

  normalizeButtonContainer(block);
  decorateButtons(block);

}
