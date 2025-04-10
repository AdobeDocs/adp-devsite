import { createTag } from '../../hlx_statics/scripts/lib-adobeio.js'

export default function insertWrapperContainer(block) {
    const wrapper = block.parentElement;
    const container = wrapper.parentElement;
    const name = block.getAttribute('data-block-name');
    const wrapperContainer = createTag('div', { class: `${name}-wrapper-container` });
    
    

    
    
    console.log('~~ hello', wrapper, container, block, name);
}



// const wrapperContainer = createTag('div', { class: 'contributors-wrapper-container' });
// const container = block.parentElement;
// container.remove(block);

// var new_parent = get_parent().get_parent()
// get_parent().remove_child(self)
// new_parent.add_child(self)