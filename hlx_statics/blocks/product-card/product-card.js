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
    block.querySelectorAll('p, div').forEach(el => {
        if (el.tagName === 'P' || el.textContent.trim()) {
            el.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
        }
    });
    block.querySelectorAll('a').forEach((a) => {
        if (a.title === "View docs") {
            a.className = "spectrum-Button spectrum-Button--outline spectrum-Button--accent spectrum-Button--sizeM"
        }
    });
    const width = block?.parentElement?.parentElement?.getAttribute('data-width');
    Array.from(block.children).forEach(div => {
        div.style.width = width;
    });

    const cards = document.querySelectorAll('.product-card');

    if (getMetadata('template') !== 'documentation') {
        cards.forEach(card =>
            card.querySelectorAll(':scope > div').forEach(div => {
                div.classList.add('spectrum-Card', 'spectrum-Card--sizeM');
                div.children[0]?.classList.add('spectrum-Card-body');
                div.children[1]?.classList.add('spectrum-Card-footer');
            })
        );
    } else {
        cards.forEach(card => {
            Array.from(card.children).forEach(c => {
                if (c.querySelector('.spectrum-Card-body') && c.querySelector('.spectrum-Card-footer')) return;

                const btn = c.querySelector('.button-container') || c.lastElementChild;
                if (!btn || (!btn.querySelector('a') && ![...c.children].some(el => el.textContent.trim()))) {
                    c.remove();
                    return;
                }

                const body = createTag('div', { class: 'spectrum-Card-body' });
                const footer = createTag('div', { class: 'spectrum-Card-footer' });

                btn.classList.add('button-container');
                const parent = btn.parentElement;
                if (!parent || parent.classList.contains('spectrum-Card-footer')) return;

                while (parent.firstChild && parent.firstChild !== btn) body.appendChild(parent.firstChild);
                footer.appendChild(btn);
                parent.innerHTML = '';
                parent.append(body, footer);
            });
        });
    }

    Array.from(block.children).forEach(card => {
        const footer = card.querySelector('.spectrum-Card-footer');
        if (!footer || footer.querySelector('.all-button-container')) return;

        const wrapper = createTag('div', { class: 'all-button-container' });

        card.querySelectorAll('.button-container').forEach(btn => {
            const links = btn.querySelectorAll('ul li a, a');
            if (!links.length) return;

            const container = createTag('div', { class: 'button-container' });
            links.forEach((a, i) => {
                const clone = a.cloneNode(true);
                clone.className = `spectrum-Button spectrum-Button--sizeM spectrum-Button--outline ${i ? 'spectrum-Button--accent' : 'spectrum-Button--secondary'}`;
                container.appendChild(clone);
            });

            wrapper.appendChild(container);
            btn.remove();
        });

        if (wrapper.childElementCount) footer.appendChild(wrapper);
    });

}
