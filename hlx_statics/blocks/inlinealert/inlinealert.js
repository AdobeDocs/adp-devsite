import {
    createTag,
  } from '../../scripts/lib-adobeio.js';
import { getMetadata } from '../../scripts/scripts.js';

export function getVariant(classList) {
    // variants: neutral, info, help, success, warning, error
    let classVariant = {
        class: '',
        icon: ''
    };

    if(classList.contains('neutral')){
        classVariant.class = 'spectrum-InLineAlert--neutral';
    }
    else if(classList.contains('help')){
        classVariant.class = 'spectrum-InLineAlert--help';
        classVariant.icon = `<svg class="spectrum-Icon spectrum-UIIcon-HelpMedium spectrum-InLineAlert-icon" style="width: 22px; height: 22px;"><use href="/hlx_statics/icons/help-icon.svg#icon-help"></use></svg>`;
    }
    else if(classList.contains('success')){
        classVariant.class = 'spectrum-InLineAlert--success';
        classVariant.icon =  `<svg class="spectrum-Icon spectrum-UIIcon-SuccessMedium spectrum-InLineAlert-icon" style="width: 22px; height: 22px;"><use href="/hlx_statics/icons/success-icon.svg#icon-success"></use></svg>`;
    }
    else if(classList.contains('warning')){
        classVariant.class = 'spectrum-InLineAlert--warning';
        classVariant.icon = `<svg class="spectrum-Icon spectrum-UIIcon-AlertMedium spectrum-InLineAlert-icon" style="width: 22px; height: 22px;"><use href="/hlx_statics/icons/warning-icon.svg#icon-alert"></use></svg>`;
    }
    else if(classList.contains('error')){
        classVariant.class = 'spectrum-InLineAlert--error';
        classVariant.icon =`<svg class="spectrum-Icon spectrum-UIIcon-AlertMedium spectrum-InLineAlert-icon" style="width: 22px; height: 22px;"><use href="/hlx_statics/icons/warning-icon.svg#icon-alert"></use></svg>`;
    }
    else{
        classVariant.class = 'spectrum-InLineAlert--info';
        classVariant.icon = `<svg class="spectrum-Icon spectrum-UIIcon-InfoMedium spectrum-InLineAlert-icon" focusable="false" aria-hidden="true" style="width: 22px; height: 22px;"><use href="/hlx_statics/icons/info.svg#icon-info"></use></svg>`;
    }
    return classVariant;
}

  /**
 * loads and decorates the columns
 * @param {Element} block The columns block element
 */
export default async function decorate(block) {

        block.classList.add('spectrum-InLineAlert');
        const slots = block?.getAttribute('data-slots')?.split(',');
        const classVariant = getVariant(block.classList);

        block.classList.add(classVariant.class);
        block.insertAdjacentHTML("afterbegin", classVariant.icon);

        // need to wrap content into p
        block.querySelectorAll('div').forEach((divContent) =>{
            const inlineP = createTag('p', { class: 'spectrum-InLineAlert-content' });
            inlineP.innerHTML = divContent.innerHTML;
            block.appendChild(inlineP);
            divContent.replaceWith(inlineP);
        });
        if (slots?.includes('title')) {
            const paragraphTag = block.querySelector('p');
            const firstDiv = paragraphTag.querySelector('div');
            if (firstDiv) {
                firstDiv.remove();
            }
        }
}
