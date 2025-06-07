import { createTag } from "../../scripts/lib-adobeio.js";

/**
 * decorates the herosimple
 * @param {Element} block The herosimple block element
 */
export default async function decorate(block) {
  const background = block.getAttribute('data-background') || 'rgb(29, 125, 238)';
  block.style.background = background;

  const variant = block.getAttribute('data-variant') || 'fullWidth';
  block.classList.add(variant);

  const textColor = block.getAttribute('data-textcolor') || 'rgb(44, 44, 44)';
  block.style.color = textColor;

  const layoutWrapper = createTag('div', { class: "herosimple-container-wrapper" });
  const contentContainer = createTag('div', { class: "hero-left-content" });
  const imageContainer = createTag('div', { class: "hero-right-image" });

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
  if (pictureElement && variant === "fullWidth") {
    const parentDiv = pictureElement.parentElement;
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

}
