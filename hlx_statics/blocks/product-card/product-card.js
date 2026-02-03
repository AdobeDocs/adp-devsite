import { createTag } from '../../scripts/lib-adobeio.js';
import { IS_DEV_DOCS } from '../../scripts/lib-helix.js';
import { getMetadata } from '../../scripts/scripts.js';

/**
 * decorates the title
 * @param {Element} block The title block element {Parameter Type} Name of the Parameter
 */
export default async function decorate(block) {
    block.setAttribute('daa-lh', 'product-card');

    const width = block?.parentElement?.parentElement?.getAttribute('data-width');

    block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS', 'title-heading');
    });

    Array.from(block.children).forEach((card) => {
        card.style.width = width;

        card.querySelectorAll('p, div').forEach(p => {
            if (p.textContent.trim() || p.tagName === 'P') {
                p.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
            }
        });

        card.classList.add('spectrum-Card', 'spectrum-Card--sizeM');

        const body = createTag('div', { class: 'spectrum-Card-body' });
        const footer = createTag('div', { class: 'spectrum-Card-footer' });
        const btnWrap = createTag('div', { class: 'all-button-container' });

        if (IS_DEV_DOCS) {
            const buttons = [];

            Array.from(card.children).forEach((child) => {
                const aTags = child.querySelectorAll('a');
                if (aTags.length > 0) {
                    aTags.forEach((a) => buttons.push(a));
                    child.remove();
                } else {
                    body.appendChild(child);
                }
            });

            buttons.forEach(a => btnWrap.appendChild(a));
            if (buttons.length) footer.appendChild(btnWrap);
            card.append(body, ...(buttons.length ? [footer] : []));
        } else {
            card.lastElementChild?.querySelectorAll('.button-container')?.forEach(p => btnWrap.append(p));
            btnWrap.append(card.lastElementChild);
            footer.append(btnWrap);

            card.firstElementChild?.children && [...card.firstElementChild.children].forEach(ele => body.appendChild(ele));
            card.prepend(body);
            card.append(footer);
        }
    });

    Array.from(block.children).forEach(card => {
        card.querySelectorAll('a').forEach((a, index) => {
            const isStrong = a.parentElement.tagName === 'STRONG';
            a.className = `spectrum-Button spectrum-Button--outline spectrum-Button--${isStrong || (IS_DEV_DOCS && index === 1) ? 'accent' : 'secondary'} spectrum-Button--sizeM`;
        });
    });

    block.querySelectorAll('p, div').forEach(el => {
        if (!el.innerHTML.trim()) el.remove();
    });
}
