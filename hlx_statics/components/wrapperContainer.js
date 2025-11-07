import { createTag } from '../../hlx_statics/scripts/lib-adobeio.js'

export default function insertWrapperContainer(block) {
    const wrapper = block.parentElement;
    const name = block.getAttribute('data-block-name');
    const wrapperContainer = createTag('div', { class: `${name}-wrapper-container` });
    wrapper.replaceWith(wrapperContainer);
    wrapperContainer.appendChild(wrapper);
}

export function insertWrapperChild(block) {
    const name = block.getAttribute('data-block-name');
    const wrapperChild = createTag('div', { class: `${name}-wrapper-child` });
    block.replaceWith(wrapperChild);
    wrapperChild.appendChild(block);
}