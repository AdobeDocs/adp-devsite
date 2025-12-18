/**
 * decorates the info
 * @param {Element} block The info block element
 */

import { createTag } from "../../scripts/lib-adobeio.js";
import { getMetadata } from "../../scripts/scripts.js";

// Form state management
const formData = {
  CredentialName: '',
  AllowedOrigins: '',
  Downloads: false,
  AdobeDeveloperConsole: false,
  Download: null
};

// Constants
const HELP_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18"></rect><path d="M10.09064,12.966a.9167.9167,0,0,1-.97722,1.0076.93092.93092,0,0,1-.97769-1.0076.97756.97756,0,0,1,1.95491-.02931Q10.09085,12.95135,10.09064,12.966ZM8.97658,4a4.61617,4.61617,0,0,0-2.2591.5362c-.05924.03139-.05924.09215-.05924.15342V6.17521a.07459.07459,0,0,0,.11854.06076,3.69224,3.69224,0,0,1,1.87246-.50481c.90632,0,1.26328.38278,1.26328.93417,0,.47493-.28253.79645-.77259,1.30176C8.42665,8.70278,7.99526,9.1615,7.99526,9.8815a1.70875,1.70875,0,0,0,.357,1.05721A.244.244,0,0,0,8.54519,11h1.2929a.06531.06531,0,0,0,.05931-.10734,1.65129,1.65129,0,0,1-.23779-.843c0-.45874.54994-.96405,1.12955-1.53113a2.73714,2.73714,0,0,0,.95107-2.1129C11.74024,5.05774,10.75955,4,8.97658,4ZM17.5,9A8.5,8.5,0,1,1,9,.50005H9A8.5,8.5,0,0,1,17.5,9ZM15.6748,9A6.67481,6.67481,0,1,0,9,15.67476H9A6.67476,6.67476,0,0,0,15.6748,9Z"></path></svg>';

function handleInputChange(value, fieldName) {
  formData[fieldName] = value;
  if (fieldName === 'CredentialName') {
    const counter = document.querySelector(`[data-counter="${fieldName}"]`);
    if (counter) {
      counter.textContent = parseInt(counter.getAttribute('data-max')) - value.length;
    }
  }
}

function createHelpIcon(config) {
  if (!config.contextHelp) return null;
  const helpIcon = createTag('span', {
    class: 'help-icon',
    'data-heading': config.contextHelpHeading || ''
  });
  helpIcon.innerHTML = HELP_ICON_SVG;
  return helpIcon;
}

function createFieldLabel(config, fieldName, isCheckbox = false) {
  const labelDiv = createTag('div', { class: 'label-section' });
  const label = createTag('label', {
    class: `spectrum-Body spectrum-Body--sizeS ${isCheckbox ? 'checkbox-label' : 'field-label'}`,
    ...(fieldName && { for: isCheckbox ? fieldName : `textfield-${fieldName}` })
  });
  label.textContent = config.label;

  if (config.required) {
    const asterisk = createTag('span', { class: 'required-asterisk' });
    asterisk.textContent = '*';
    label.appendChild(asterisk);
  }

  labelDiv.appendChild(label);
  const helpIcon = createHelpIcon(config);
  if (helpIcon) labelDiv.appendChild(helpIcon);
  return labelDiv;
}

function addDescription(container, text) {
  if (text) {
    const desc = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS field-description' });
    desc.textContent = text;
    container.appendChild(desc);
  }
}

function createCredentialNameField(config) {
  const fieldContainer = createTag('div', { class: 'form-field' });
  const labelSection = createTag('div', { class: 'spectrum-Textfield spectrum-Textfield--sizeM field-header' });
  
  config.required = true;
  labelSection.appendChild(createFieldLabel(config, 'CredentialName'));

  if (config.range) {
    const charCount = createTag('span', {
      class: 'spectrum-Textfield-characterCount',
      'data-counter': 'CredentialName',
      'data-max': config.range
    });
    charCount.textContent = config.range;
    labelSection.appendChild(charCount);
  }

  fieldContainer.appendChild(labelSection);

  const input = createTag('input', {
    type: 'text',
    class: 'credential-input',
    placeholder: config.placeholder || '',
    maxlength: config.range || '',
    'data-cy': 'add-credential-name',
    required: true
  });
  input.addEventListener('input', (e) => handleInputChange(e.target.value, 'CredentialName'));
  fieldContainer.appendChild(input);
  addDescription(fieldContainer, config.description);

  return fieldContainer;
}

function createAllowedOriginsField(config) {
  const fieldContainer = createTag('div', { class: 'form-field' });
  const labelSection = createTag('div', { class: 'spectrum-Textfield spectrum-Textfield--sizeM field-header' });
  
  labelSection.appendChild(createFieldLabel(config, 'AllowedOrigins'));
  fieldContainer.appendChild(labelSection);

  const textarea = createTag('textarea', {
    class: 'origins-textarea',
    placeholder: config.placeholder || '',
    'data-cy': 'add-allowed-origins'
  });
  textarea.addEventListener('input', (e) => handleInputChange(e.target.value, 'AllowedOrigins'));
  fieldContainer.appendChild(textarea);
  addDescription(fieldContainer, config.description);

  return fieldContainer;
}

function createDownloadsField(config) {
  const fieldContainer = createTag('div', { class: 'form-field downloads-field' });
  const checkboxWrapper = createTag('div', { class: 'checkbox-wrapper' });

  const checkbox = createTag('input', {
    type: 'checkbox',
    class: 'downloads-checkbox',
    'data-cy': 'download-checkBox',
    id: 'downloads-checkbox'
  });

  checkbox.addEventListener('change', (e) => {
    handleInputChange(e.target.checked, 'Downloads');
    const downloadOptions = fieldContainer.querySelector('.download-options');
    if (downloadOptions) downloadOptions.style.display = e.target.checked ? 'flex' : 'none';
  });

  checkboxWrapper.appendChild(checkbox);
  checkboxWrapper.appendChild(createFieldLabel(config, 'downloads-checkbox', true));
  fieldContainer.appendChild(checkboxWrapper);

  if (config.items?.length) {
    const downloadOptions = createTag('div', { class: 'download-options', style: 'display: none;' });

    config.items.forEach((item, index) => {
      const download = item.Download;
      const downloadOption = createTag('button', {
        type: 'button',
        class: 'download-option',
        'data-href': download.href,
        'data-cy': `download-option-${index}`
      });
      downloadOption.textContent = download.title;

      downloadOption.addEventListener('click', (e) => {
        e.preventDefault();
        downloadOptions.querySelectorAll('.download-option').forEach(opt => opt.classList.remove('selected'));
        downloadOption.classList.add('selected');
        formData.Download = download;
      });

      downloadOptions.appendChild(downloadOption);
    });

    fieldContainer.appendChild(downloadOptions);
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
      productItem.appendChild(createTag('span', { class: `product-icon icon-${product.icon}` }));
    }

    const productLabel = createTag('span', { class: 'product-label' });
    productLabel.textContent = product.label;
    productItem.appendChild(productLabel);
    productsList.appendChild(productItem);
  });

  fieldContainer.appendChild(productsList);
  return fieldContainer;
}

function createAgreementField(config) {
  const fieldContainer = createTag('div', { class: 'form-field agreement-field' });
  const checkboxWrapper = createTag('div', { class: 'checkbox-wrapper' });

  const checkbox = createTag('input', { type: 'checkbox', class: 'agreement-checkbox' });
  checkbox.addEventListener('change', (e) => handleInputChange(e.target.checked, 'AdobeDeveloperConsole'));

  const labelText = createTag('span', { class: 'agreement-text' });
  labelText.textContent = config.label + ' ';

  const link = createTag('a', { href: config.href, target: '_blank', class: 'agreement-link' });
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
    if (element.style) Object.assign(el.style, element.style);
    if (element.href) el.href = element.href;
    el.textContent = element.text;
    sideContainer.appendChild(el);
  });

  return sideContainer;
}

function createSignInContent(config) {
  const signInWrapper = createTag('div', { class: 'sign-in-wrapper' });

  if (config.title) {
    const title = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeXL sign-in-title' });
    title.textContent = config.title;
    signInWrapper.appendChild(title);
  }

  if (config.paragraph) {
    const paragraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL sign-in-description' });
    paragraph.textContent = config.paragraph;
    signInWrapper.appendChild(paragraph);
  }

  const button = createTag('button', {
    class: 'spectrum-Button spectrum-Button--outline spectrum-Button--sizeM sign-in-button',
    type: 'button',
    'data-cy': 'sign-in-button'
  });
  const buttonLabel = createTag('span', { class: 'spectrum-Button-label' });
  buttonLabel.textContent = 'Sign in to create credentials';
  button.appendChild(buttonLabel);
  signInWrapper.appendChild(button);

  return signInWrapper;
}

export default async function decorate(block) {
  const pathPrefix = getMetadata('pathprefix').replace(/^\/|\/$/g, '');
  const navPath = `${window.location.origin}/${pathPrefix}/credential/getcredential.json`;

  let credentialData;
  try {
    const response = await fetch(navPath);
    if (!response.ok) throw new Error('Failed to load');
    
    const credentialJSON = await response.json();
    credentialData = credentialJSON?.data?.[0]?.['GetCredential']?.components;
    
    if (!credentialData) {
      block.innerHTML = '<p>No credential data available.</p>';
      return;
    }
  } catch (error) {
    block.innerHTML = '<p>Error loading credential data.</p>';
    return;
  }

  block.innerHTML = '';

  // Create sign-in container
  let signInContainer;
  if (credentialData.SignIn) {
    signInContainer = createTag('div', { class: 'sign-in-container' });
    signInContainer.appendChild(createSignInContent(credentialData.SignIn));
    block.appendChild(signInContainer);
  }

  // Create form container
  let formContainer;
  if (credentialData.Form) {
    const { title, paragraph, components } = credentialData.Form;
    formContainer = createTag('div', { class: 'getcredential-form hidden' });
    const formHeader = createTag('div', { class: 'form-header' });

    if (title) {
      const titleEl = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeL form-title' });
      titleEl.textContent = title;
      formHeader.appendChild(titleEl);
    }

    if (paragraph) {
      const paragraphEl = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL form-description' });
      paragraphEl.textContent = paragraph;
      formHeader.appendChild(paragraphEl);
    }

    // Organization notice
    const orgNotice = createTag('div', { class: 'org-notice' });
    const orgText = createTag('span', { class: 'org-text' });
    orgText.textContent = "You're creating this credential in your personal developer organization  ";
    const changeOrgLink = createTag('a', { class: 'change-org-link', href: '#' });
    changeOrgLink.textContent = 'Change organization';
    changeOrgLink.addEventListener('click', (e) => e.preventDefault());
    orgNotice.appendChild(orgText);
    orgNotice.appendChild(changeOrgLink);
    formHeader.appendChild(orgNotice);

    const formWrapper = createTag('div', { class: 'form-wrapper' });
    const formFields = createTag('form', { class: 'credential-form' });

    // Add form fields
    if (components?.CredentialName) formFields.appendChild(createCredentialNameField(components.CredentialName));
    if (components?.AllowedOrigins) formFields.appendChild(createAllowedOriginsField(components.AllowedOrigins));
    if (components?.Downloads) formFields.appendChild(createDownloadsField(components.Downloads));
    if (components?.Products) formFields.appendChild(createProductsField(components.Products));
    if (components?.AdobeDeveloperConsole) formFields.appendChild(createAgreementField(components.AdobeDeveloperConsole));

    // Form buttons
    const formButtons = createTag('div', { class: 'form-buttons' });
    const createButton = createTag('button', {
      class: 'spectrum-Button spectrum-Button--fill spectrum-Button--accent spectrum-Button--sizeM create-button',
      type: 'submit',
      'data-cy': 'create-credential-btn'
    });
    const createButtonLabel = createTag('span', { class: 'spectrum-Button-label' });
    createButtonLabel.textContent = 'Create credential';
    createButton.appendChild(createButtonLabel);
    createButton.addEventListener('click', (e) => e.preventDefault());

    const cancelButton = createTag('a', { href: '#', class: 'cancel-link' });
    cancelButton.textContent = 'Cancel';

    formButtons.appendChild(createButton);
    formButtons.appendChild(cancelButton);
    formFields.appendChild(formButtons);
    formWrapper.appendChild(formFields);

    if (components?.Side) {
      formWrapper.appendChild(createTag('div', { class: 'separator' }));
      formWrapper.appendChild(createSideContent(components.Side));
    }

    formContainer.appendChild(formHeader);
    formContainer.appendChild(formWrapper);
    block.appendChild(formContainer);
  }

  // Sign-in button handler
  if (signInContainer && formContainer) {
    const signInButton = signInContainer.querySelector('.sign-in-button');
    if (signInButton) {
      signInButton.addEventListener('click', () => {
        signInContainer.classList.add('hidden');
        formContainer.classList.remove('hidden');
        // window.adobeIMS.signIn();
      });
    }
  }
}
