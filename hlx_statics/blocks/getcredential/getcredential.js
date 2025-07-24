/**
 * decorates the info
 * @param {Element} block The info block element
 */

import { createTag } from "../../scripts/lib-adobeio.js";
import { getMetadata } from "../../scripts/scripts.js";

// Form state management
let formData = {
    CredentialName: '',
    AllowedOrigins: '',
    Downloads: false,
    AdobeDeveloperConsole: false,
    Download: null
};

function handleInputChange(value, fieldName) {
    formData[fieldName] = value;
    if (fieldName === 'CredentialName') {
        updateCharacterCount(fieldName, value);
    }
}

function updateCharacterCount(fieldName, value) {
    const counter = document.querySelector(`[data-counter="${fieldName}"]`);
    if (counter) {
        const maxLength = parseInt(counter.getAttribute('data-max'));
        counter.textContent = maxLength - value.length;
    }
}

function createFormField(config, fieldName) {
    const fieldContainer = createTag('div', { class: 'form-field' });
    
    if (config.label) {
        const labelSection = createTag('div', { class: 'spectrum-Textfield spectrum-Textfield--sizeM field-header' });
        const labelDiv = createTag('div', { class: 'label-section' });
        
        const labelEl = createTag('label', { 
            class: 'spectrum-Body spectrum-Body--sizeS field-label',
            for: `textfield-${fieldName}`
        });
        labelEl.textContent = config.label;
        labelDiv.appendChild(labelEl);
        labelSection.appendChild(labelDiv);
        
        if (config.range) {
            const charCount = createTag('span', { 
                class: 'spectrum-Textfield-characterCount',
                'data-counter': fieldName,
                'data-max': config.range
            });
            charCount.textContent = config.range;
            labelSection.appendChild(charCount);
        }
        
        fieldContainer.appendChild(labelSection);
    }
    
    return fieldContainer;
}

function createCredentialNameField(config) {
    const fieldContainer = createFormField(config, 'CredentialName');
    
    const input = createTag('input', {
        type: 'text',
        class: 'credential-input',
        'data-field': 'CredentialName',
        placeholder: config.placeholder || '',
        maxlength: config.range || '',
        'data-cy': 'add-credential-name'
    });
    
    input.addEventListener('input', (e) => {
        handleInputChange(e.target.value, 'CredentialName');
    });
    
    fieldContainer.appendChild(input);
    
    if (config.description) {
        const descP = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS field-description' });
        descP.textContent = config.description;
        fieldContainer.appendChild(descP);
    }
    
    return fieldContainer;
}

function createAllowedOriginsField(config) {
    const fieldContainer = createFormField(config, 'AllowedOrigins');
    
    const textarea = createTag('textarea', {
        class: 'origins-textarea',
        'data-field': 'AllowedOrigins',
        placeholder: config.placeholder || '',
        'data-cy': 'add-allowed-origins'
    });
    
    textarea.addEventListener('input', (e) => {
        handleInputChange(e.target.value, 'AllowedOrigins');
    });
    
    fieldContainer.appendChild(textarea);
    
    if (config.description) {
        const descP = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS field-description' });
        descP.textContent = config.description;
        fieldContainer.appendChild(descP);
    }
    
    return fieldContainer;
}

function createProductsField(config) {
    const fieldContainer = createTag('div', { class: 'form-field products-field' });
    
    if (config.label) {
        const label = createTag('label', { class: 'spectrum-Body spectrum-Body--sizeS field-label' });
        label.textContent = config.label;
        fieldContainer.appendChild(label);
    }
    
    const productsList = createTag('div', { class: 'products-list' });
    
    config.items?.forEach(item => {
        const product = item.Product;
        const productItem = createTag('div', { class: 'product-item' });
        
        if (product.icon) {
            const icon = createTag('span', { class: `product-icon icon-${product.icon}` });
            productItem.appendChild(icon);
        }
        
        const productLabel = createTag('span', { class: 'product-label' });
        productLabel.textContent = product.label;
        productItem.appendChild(productLabel);
        
        productsList.appendChild(productItem);
    });
    
    fieldContainer.appendChild(productsList);
    return fieldContainer;
}

function createDownloadsField(config) {
    const fieldContainer = createTag('div', { class: 'form-field downloads-field' });
    
    const checkboxWrapper = createTag('div', { class: 'checkbox-wrapper' });
    
    const checkbox = createTag('input', {
        type: 'checkbox',
        class: 'downloads-checkbox',
        'data-cy': 'download-checkBox'
    });
    
    checkbox.addEventListener('change', (e) => {
        handleInputChange(e.target.checked, 'Downloads');
    });
    
    const label = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeS checkbox-label' });
    label.textContent = config.label;
    
    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(label);
        fieldContainer.appendChild(checkboxWrapper);
    
    return fieldContainer;
}

function createAgreementField(config) {
    const fieldContainer = createTag('div', { class: 'form-field agreement-field' });
    
    const checkboxWrapper = createTag('div', { class: 'checkbox-wrapper' });
    
    const checkbox = createTag('input', {
        type: 'checkbox',
        class: 'agreement-checkbox'
    });
    
    checkbox.addEventListener('change', (e) => {
        handleInputChange(e.target.checked, 'AdobeDeveloperConsole');
    });
    
    const labelText = createTag('span', { class: 'agreement-text' });
    labelText.textContent = config.label + ' ';
    
    const link = createTag('a', {
        href: config.href,
        target: '_blank',
        class: 'agreement-link'
    });
    link.textContent = config.linkText;
    
    labelText.appendChild(link);
    
    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(labelText);
    fieldContainer.appendChild(checkboxWrapper);
    
    return fieldContainer;
}

function createSideContent(config) {
    const sideContainer = createTag('div', { class: 'side-content' });
    
    config.content.elements.forEach(element => {
        const el = createTag(element.type, { class: element.className || '' });
        
        if (element.style) {
            Object.keys(element.style).forEach(style => {
                el.style[style] = element.style[style];
            });
        }
        
        if (element.href) {
            el.href = element.href;
        }
        
        el.textContent = element.text;
        sideContainer.appendChild(el);
    });
    
    return sideContainer;
}

function navigateToForm() {
    const signInSection = document.querySelector('.getcredential:not(.getcredential-form)');
    const formSection = document.querySelector('.getcredential-form');
    
    if (signInSection) signInSection.classList.add('hidden');
    if (formSection) {
        formSection.classList.remove('hidden');
        formSection.classList.add('visible');
    }
}

function navigateBackToSignIn() {
    const signInSection = document.querySelector('.getcredential:not(.getcredential-form)');
    const formSection = document.querySelector('.getcredential-form');
    
    if (signInSection) signInSection.classList.remove('hidden');
    if (formSection) {
        formSection.classList.add('hidden');
        formSection.classList.remove('visible');
    }
}

export default async function decorate(block) {
    let pathPrefix = getMetadata('pathprefix').replace(/^\/|\/$/g, '');
    let navPath = `${window.location.origin}/${pathPrefix}/credential/getcredential.json`;

    let credentialJSON;
    let credentialData;

    try {
        const response = await fetch(navPath);
        if (response.ok) {
            credentialJSON = await response.json();
            if (credentialJSON?.data?.length > 0) {
                credentialData = credentialJSON.data[0];
            } else {
                block.innerHTML = '<p>No credential data available.</p>';
                return;
            }
        } else {
            block.innerHTML = '<p>Failed to load credential data.</p>';
            return;
        }
    } catch (error) {
        block.innerHTML = '<p>Error loading credential data.</p>';
        return;
    }

    block.innerHTML = '';

    if(credentialData.SignIn) {
        const signIn = credentialData.SignIn;
        const signInForm = createTag('div', { class: 'getcredential' });
        
        if (signIn.title) {
            const title = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeL getcredential-title' });
            title.textContent = signIn.title;
            signInForm.appendChild(title);
        }
        
        if (signIn.paragraph) {
            const paragraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL getcredential-paragraph' });
            paragraph.textContent = signIn.paragraph;
            signInForm.appendChild(paragraph);
        }
        
        if (signIn.buttonText) {
            const button = createTag('button', { 
                class: 'spectrum-Button spectrum-Button--outline spectrum-Button--primary spectrum-Button--sizeM getcredential-button',
                'data-cy': 'sign-in-btn'
            });
            
            const buttonLabel = createTag('span', { class: 'spectrum-Button-label' });
            buttonLabel.textContent = signIn.buttonText;
            button.appendChild(buttonLabel);
            
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                setTimeout(navigateToForm, 100);
            });
            
            signInForm.appendChild(button);
        }
        
        block.appendChild(signInForm);
    }

    if(credentialData.Form) {
        const credentialForm = credentialData.Form;
        const formContainer = createTag('div', { class: 'getcredential-form hidden' });
        
        const backButton = createTag('button', { class: 'back-button' });
        backButton.innerHTML = '← Back to Sign In';
        backButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            navigateBackToSignIn();
        });
        formContainer.appendChild(backButton);
        
        if (credentialForm.title) {
            const title = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeL form-title' });
            title.textContent = credentialForm.title;
            formContainer.appendChild(title);
        }
        
        if (credentialForm.paragraph) {
            const paragraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL form-description' });
            paragraph.textContent = credentialForm.paragraph;
            formContainer.appendChild(paragraph);
        }
        
        const formWrapper = createTag('div', { class: 'form-wrapper' });
        const formFields = createTag('form', { class: 'credential-form' });
        const components = credentialForm.components;
        
        if (components?.CredentialName) {
            formFields.appendChild(createCredentialNameField(components.CredentialName));
        }
        
        if (components?.AllowedOrigins) {
            formFields.appendChild(createAllowedOriginsField(components.AllowedOrigins));
        }
        
        if (components?.Products) {
            formFields.appendChild(createProductsField(components.Products));
        }
        
        if (components?.Downloads) {
            formFields.appendChild(createDownloadsField(components.Downloads));
        }
        
        if (components?.AdobeDeveloperConsole) {
            formFields.appendChild(createAgreementField(components.AdobeDeveloperConsole));
        }
        
        formWrapper.appendChild(formFields);
        
        if (components?.Side) {
            const sideContent = createSideContent(components.Side);
            formWrapper.appendChild(sideContent);
        }
        
        formContainer.appendChild(formWrapper);
        block.appendChild(formContainer);
    }
}
