import { createTag } from '../../scripts/lib-adobeio.js';
import { getMetadata } from '../../scripts/scripts.js';

/**
 * decorates the title
 * @param {Element} block The title block element {Parameter Type} Name of the Parameter
 */
export default async function decorate(block) {
    block.setAttribute('daa-lh', 'product-card');
    block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS', 'title-heading');
    });
    block.querySelectorAll('p, div').forEach(p => {
        if (p.textContent.trim() || p.tagName === 'P') {
            p.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
        }
    });
    const width = block?.parentElement?.parentElement?.getAttribute('data-width');
    Array.from(block.children).forEach(div => {
        div.style.width = width;
    });

    if (getMetadata('template') === 'documentation') {
        Array.from(block.children).forEach((card) => {
            const bodyWrapper = createTag('div', { class: 'spectrum-Card-body' });
            const footerWrapper = createTag('div', { class: 'spectrum-Card-footer' });
            const allButtonContainer = createTag('div', { class: 'all-button-container' });

            const buttons = [];

            Array.from(card.children).forEach((child) => {
                const aTags = child.querySelectorAll('a');
                if (aTags.length > 0) {
                    aTags.forEach((a) => buttons.push(a));
                    child.remove();
                } else {
                    bodyWrapper.appendChild(child);
                }
            });

            buttons.forEach((a) => {
                allButtonContainer.appendChild(a);
            });

            if (buttons.length > 0) {
                footerWrapper.appendChild(allButtonContainer);
                card.append(bodyWrapper, footerWrapper);
            } else {
                card.append(bodyWrapper);
            }

            card.classList.add('spectrum-Card', 'spectrum-Card--sizeM');
        });
    } else {
        Array.from(block.children).forEach((div) => {
            const newDiv = createTag('div', { class: 'all-button-container' })
            div.lastElementChild.querySelectorAll('.button-container').forEach((p) => {
                newDiv.append(p);
            })
            newDiv.append(div.lastElementChild);
            div.append(newDiv);
        })
    }

    Array.from(block.children).forEach((card) => {
        const anchors = card.querySelectorAll('a');
        anchors.forEach((a, index) => {
            const isWrappedInStrong = a.parentElement.tagName === 'STRONG';
            if (isWrappedInStrong || (getMetadata('template') === 'documentation') && index === 1) {
                a.className = "spectrum-Button spectrum-Button--outline spectrum-Button--accent spectrum-Button--sizeM";
            } else {
                a.className = "spectrum-Button spectrum-Button--sizeM spectrum-Button--outline spectrum-Button--secondary";
            }
        });
    });
}
