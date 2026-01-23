/**
 * Get Credential Block
 * Manages credential creation flow: Sign In → Return → Form → Success Card
 * @param {Element} block The getcredential block element
 */

import { createTag } from "../../scripts/lib-adobeio.js";
import { getMetadata } from "../../scripts/scripts.js";
import {
  createFieldLabel,
  createOrganizationModal,
  COPY_ICON_SVG,
  separator,
} from "./getcredential-components.js";

// ============================================================================
// FORM STATE MANAGEMENT
// ============================================================================

const formData = {
  CredentialName: '',
  AllowedOrigins: '',
  Downloads: false,
  AdobeDeveloperConsole: false,
  Download: null
};

function handleInputChange(value, fieldName) {
  formData[fieldName] = value;
  const counter = fieldName === 'CredentialName' && document.querySelector(`[data-counter="${fieldName}"]`);
  if (counter) counter.textContent = parseInt(counter.getAttribute('data-max')) - value.length;
}

// ============================================================================
// FORM FIELD COMPONENTS
// ============================================================================

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
      productItem.appendChild(createTag('img', { class: `product-icon icon` , src: product.icon }));
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

// ============================================================================
// SIGN IN PAGE
// ============================================================================

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
  button.innerHTML = '<span class="spectrum-Button-label">Sign in to create credentials</span>';
  signInWrapper.appendChild(button);

  return signInWrapper;
}

// ============================================================================
// RETURN PAGE (Previously Created Projects)
// ============================================================================

// Helper function to create credential field with copy button
function createCredentialField(label, value) {
  const field = createTag('div', { class: 'credential-detail-field' });
  const fieldLabel = createTag('label', { class: 'credential-detail-label spectrum-Body spectrum-Body--sizeS' });
  fieldLabel.textContent = label;
  
  const valueWrapper = createTag('div', { class: 'credential-detail-value-wrapper' });
  const valueInput = createTag('div', { class: 'credential-detail-value' });
  valueInput.textContent = value;
  
  const copyButton = createTag('button', {
    class: 'copy-button spectrum-ActionButton spectrum-ActionButton--sizeM',
    'data-copy': value
  });
  copyButton.innerHTML = COPY_ICON_SVG;
  
  valueWrapper.appendChild(valueInput);
  valueWrapper.appendChild(copyButton);
  field.appendChild(fieldLabel);
  field.appendChild(valueWrapper);
  return field;
}

function createReturnContent(config) {
  const returnWrapper = createTag('div', { class: 'return-wrapper' });
  
  const contentWrapper = createTag('div', { class: 'return-content-wrapper' });
  
  // Left side - "Get credentials" content
  const leftContent = createTag('div', { class: 'return-left-content' });
  
  // Get credentials header
  const getCredHeader = createTag('div', { class: 'get-cred-header' });
  const getCredTitle = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeXL' });
  getCredTitle.textContent = 'Get credentials';
  getCredHeader.appendChild(getCredTitle);
  
  const getCredDesc = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL' });
  getCredDesc.textContent = 'Create unique credentials that you will use to call Adobe Express Embed SDK from your application.';
  getCredHeader.appendChild(getCredDesc);
  
  // Organization notice
  const orgNotice = createTag('div', { class: 'org-notice-return' });
  const orgText = createTag('span', { class: 'org-text' });
  orgText.textContent = "You're viewing in your personal developer organization  ";
  const changeOrgLink = createTag('a', { class: 'change-org-link', href: '#' });
  changeOrgLink.textContent = 'Change organization';
  changeOrgLink.addEventListener('click', (e) => {
    e.preventDefault();
    const modal = createOrganizationModal();
    document.body.appendChild(modal);
  });
  orgNotice.appendChild(orgText);
  orgNotice.appendChild(changeOrgLink);
  getCredHeader.appendChild(orgNotice);
  
  leftContent.appendChild(getCredHeader);
  
  // Side content (Welcome back + Need another credential)
  if (config.components?.Side) {
    if (config.components.Side.components?.Custom) {
      const customContent = config.components.Side.components.Custom.content;
      const customWrapper = createTag('div', { class: 'return-custom-wrapper' });
      if (customContent.style) Object.assign(customWrapper.style, customContent.style);
      
      customContent.elements?.forEach(element => {
        const el = createTag(element.type, { class: element.className || '' });
        el.textContent = element.text;
        customWrapper.appendChild(el);
      });
      
      leftContent.appendChild(customWrapper);
    }
    
    if (config.components.Side.components?.NewCredential) {
      const newCredSection = createTag('div', { class: 'new-credential-section' });
      const heading = createTag('h3', { class: 'spectrum-Heading spectrum-Heading--sizeS' });
      heading.textContent = config.components.Side.components.NewCredential.heading;
      newCredSection.appendChild(heading);
      
      const button = createTag('button', {
        class: 'spectrum-Button spectrum-Button--fill spectrum-Button--accent spectrum-Button--sizeM create-new-button',
        type: 'button'
      });
      button.innerHTML = `<span class="spectrum-Button-label">${config.components.Side.components.NewCredential.buttonLabel}</span>`;
      newCredSection.appendChild(button);
      
      leftContent.appendChild(newCredSection);
    }
  }
  
  contentWrapper.appendChild(leftContent);

  const divider = separator();
  contentWrapper.appendChild(divider);
  
  // Right side - "Previously created projects" content
  const rightContent = createTag('div', { class: 'return-right-content' });
  
  // Title and paragraph
  if (config.title) {
    const title = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeXL return-title' });
    title.textContent = config.title;
    rightContent.appendChild(title);
  }
  
  if (config.paragraph) {
    const paragraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL return-description' });
    paragraph.textContent = config.paragraph;
    rightContent.appendChild(paragraph);
  }
  
  // Manage Developer Console link
  if (config.components?.ManageDeveloperConsole) {
    const manageConsoleLink = createTag('a', {
      class: 'manage-console-link',
      href: config.components.ManageDeveloperConsole.direction,
      target: '_blank'
    });
    manageConsoleLink.innerHTML = `${config.components.ManageDeveloperConsole.label} <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><path d="M16.5,9h-1a.5.5,0,0,0-.5.5V15H3V3H8.5A.5.5,0,0,0,9,2.5v-1A.5.5,0,0,0,8.5,1h-7a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5v-7A.5.5,0,0,0,16.5,9Z"></path><path d="M16.75,1H11.377A.4.4,0,0,0,11,1.4a.392.392,0,0,0,.1175.28l1.893,1.895L9.4895,7.096a.5.5,0,0,0-.00039.70711l.00039.00039.707.707a.5.5,0,0,0,.707,0l3.5215-3.521L16.318,6.882A.39051.39051,0,0,0,16.6,7a.4.4,0,0,0,.4-.377V1.25A.25.25,0,0,0,16.75,1Z"></path></svg>`;
    rightContent.appendChild(manageConsoleLink);
  }
  
  // Projects Dropdown
  if (config.components?.ProjectsDropdown) {
    const dropdownSection = createTag('div', { class: 'projects-dropdown-section' });
    const dropdownLabel = createTag('label', { class: 'spectrum-Body spectrum-Body--sizeS' });
    dropdownLabel.textContent = config.components.ProjectsDropdown.label;
    dropdownSection.appendChild(dropdownLabel);
    
    const dropdown = createTag('select', { class: 'spectrum-Picker projects-picker' });
    const option = createTag('option', {});
    option.textContent = 'Project 17';
    dropdown.appendChild(option);
    dropdownSection.appendChild(dropdown);
    
    if (config.components.ProjectsDropdown.subHeading) {
      const subHeading = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS dropdown-subheading' });
      subHeading.textContent = config.components.ProjectsDropdown.subHeading;
      dropdownSection.appendChild(subHeading);
    }
    
    rightContent.appendChild(dropdownSection);
  }
  
  // Project Card
  const projectCard = createTag('div', { class: 'return-project-card' });
  
  // Project header
  const projectHeader = createTag('div', { class: 'return-project-header' });
  const projectIconWrapper = createTag('div', { class: 'project-icon' });
  projectIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 18 18" width="32" fill="var(--spectrum-global-color-gray-700)">
    <path d="M17.761,4.3875,14.53,1.156a.75.75,0,0,0-1.06066-.00034L13.469,1.156,6.5885,8.0365A4.45,4.45,0,0,0,4.5,7.5,4.5,4.5,0,1,0,9,12a4.45,4.45,0,0,0-.5245-2.0665l3.363-3.363,1.87,1.87a.375.375,0,0,0,.53033.00017L14.239,8.4405l1.672-1.672L13.776,4.633l.6155-.6155,2.135,2.1355L17.761,4.918A.37543.37543,0,0,0,17.761,4.3875ZM3.75,14.25a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,3.75,14.25Z"></path>
  </svg>`;
  projectHeader.appendChild(projectIconWrapper);
  
  const projectTitleGroup = createTag('div', { class: 'project-title-group' });
  const projectTitle = createTag('h3', { class: 'project-title spectrum-Heading spectrum-Heading--sizeM' });
  projectTitle.textContent = 'Project 17';
  projectTitleGroup.appendChild(projectTitle);
  
  // Product icons
  if (config.components?.Products) {
    const productsRow = createTag('div', { class: 'product-icons' });
    config.components.Products.items?.forEach((item) => {
      const product = item.Product;
      const productIcon = createTag('img', { class: `product-icon icon`, src: product.icon });
      productsRow.appendChild(productIcon);
    });
    projectTitleGroup.appendChild(productsRow);
  }
  
  projectHeader.appendChild(projectTitleGroup);
  projectCard.appendChild(projectHeader);
  
  // Divider
  projectCard.appendChild(createTag('div', { class: 'card-divider' }));
  
  // Developer Console Project
  if (config.components?.DevConsoleLink) {
    const devConsoleSection = createTag('div', { class: 'dev-console-section' });
    const devConsoleLabel = createTag('h3', { class: 'section-label spectrum-Heading spectrum-Heading--sizeS' });
    devConsoleLabel.textContent = config.components.DevConsoleLink.heading;
    devConsoleSection.appendChild(devConsoleLabel);
    
    const projectLink = createTag('div', { class: 'project-link spectrum-Body spectrum-Body--sizeS' });
    projectLink.innerHTML = '<a target="_blank" href="/console/projects/248947/4566206088344878645/overview"><div><p class="spectrum-Body spectrum-Body--sizeS">Project 17</p></div><div><svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><path d="M16.5,9h-1a.5.5,0,0,0-.5.5V15H3V3H8.5A.5.5,0,0,0,9,2.5v-1A.5.5,0,0,0,8.5,1h-7a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5v-7A.5.5,0,0,0,16.5,9Z"></path><path d="M16.75,1H11.377A.4.4,0,0,0,11,1.4a.392.392,0,0,0,.1175.28l1.893,1.895L9.4895,7.096a.5.5,0,0,0-.00039.70711l.00039.00039.707.707a.5.5,0,0,0,.707,0l3.5215-3.521L16.318,6.882A.39051.39051,0,0,0,16.6,7a.4.4,0,0,0,.4-.377V1.25A.25.25,0,0,0,16.75,1Z"></path></svg></div></a>';
    devConsoleSection.appendChild(projectLink);
    projectCard.appendChild(devConsoleSection);
  }
    
  // Credential Details
  if (config.components?.CredentialDetails) {
    const credentialSection = createTag('div', { class: 'credential-section' });
    const credentialTitle = createTag('h3', { class: 'spectrum-Heading spectrum-Heading--sizeS' });
    credentialTitle.textContent = config.components.CredentialDetails.heading;
    credentialSection.appendChild(credentialTitle);
    
    // API Key
    if (config.components.CredentialDetails.components?.APIKey) {
      credentialSection.appendChild(createCredentialField(
        config.components.CredentialDetails.components.APIKey.heading,
        'c89a083272b247f1beb4a59d37b982e9'
      ));
    }
    
    // Allowed Origins
    if (config.components.CredentialDetails.components?.AllowedOrigins) {
      credentialSection.appendChild(createCredentialField(
        config.components.CredentialDetails.components.AllowedOrigins.heading,
        'localhost:8000'
      ));
    }
    
    // Organization
    if (config.components.CredentialDetails.components?.OrganizationName) {
      const orgField = createTag('div', { class: 'credential-detail-field' });
      const orgLabel = createTag('label', { class: 'credential-detail-label spectrum-Body spectrum-Body--sizeS' });
      orgLabel.textContent = config.components.CredentialDetails.components.OrganizationName.heading;
      
      const orgValue = createTag('div', { class: 'credential-detail-text' });
      orgValue.textContent = 'deepesh-testusr2-adobetest.com';
      orgField.appendChild(orgLabel);
      orgField.appendChild(orgValue);
      credentialSection.appendChild(orgField);
    }
    
    projectCard.appendChild(credentialSection);
  }
  
  // Divider before button
  // projectCard.appendChild(createTag('div', { class: 'card-divider' }));
  
  // Next steps button
  if (config.nextStepsLabel && config.nextStepsHref) {
    const buttonsSection = createTag('div', { class: 'card-buttons' });
    const nextStepsButton = createTag('a', {
      class: 'spectrum-Button spectrum-Button--outline spectrum-Button--primary spectrum-Button--sizeM',
      href: config.nextStepsHref
    });
    nextStepsButton.innerHTML = `<span class="spectrum-Button-label">${config.nextStepsLabel}</span>`;
    buttonsSection.appendChild(nextStepsButton);
    projectCard.appendChild(buttonsSection);
  }
  
  rightContent.appendChild(projectCard);
  contentWrapper.appendChild(rightContent);
  
  returnWrapper.appendChild(contentWrapper);
  return returnWrapper;
}

// ============================================================================
// SUCCESS CARD PAGE
// ============================================================================

function createCredentialCard(config) {
  const cardContainer = createTag('div', { class: 'credential-card-container' });

  const cardTitleWrapper = createTag('div', { class: 'card-title-wrapper' });

  // Card title
  if (config.title) {
    const title = createTag('h2', { class: 'spectrum-Heading spectrum-Heading--sizeL card-title' });
    title.textContent = config.title;
    cardTitleWrapper.appendChild(title);
  }

  // Card paragraph
  if (config.paragraph) {
    const paragraph = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeL  card-paragraph' });
    paragraph.textContent = config.paragraph;
    cardTitleWrapper.appendChild(paragraph);
  }

  const downloadOptions = createTag('div', { class: 'restart-download-wrapper' });
  downloadOptions.innerHTML = '<p class="spectrum-Body spectrum-Body--sizeS">Download not working?</p><a class="restart-download-link">Restart download</a>';
  cardTitleWrapper.appendChild(downloadOptions);

  cardContainer.appendChild(cardTitleWrapper);

  const cardWrapper = createTag('div', { class: 'card-wrapper' });

  // Main card content
  const cardContent = createTag('div', { class: 'card-content' });

  // Project Card (single card containing all sections)
  const projectCard = createTag('div', { class: 'project-card' });

  // Header: Icon + Title + Product Icons
  const projectHeader = createTag('div', { class: 'project-header' });

  const projectIconWrapper = createTag('div', { class: 'project-icon' });
  projectIconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 18 18" width="32" fill="var(--spectrum-global-color-gray-700)">
    <path d="M17.761,4.3875,14.53,1.156a.75.75,0,0,0-1.06066-.00034L13.469,1.156,6.5885,8.0365A4.45,4.45,0,0,0,4.5,7.5,4.5,4.5,0,1,0,9,12a4.45,4.45,0,0,0-.5245-2.0665l3.363-3.363,1.87,1.87a.375.375,0,0,0,.53033.00017L14.239,8.4405l1.672-1.672L13.776,4.633l.6155-.6155,2.135,2.1355L17.761,4.918A.37543.37543,0,0,0,17.761,4.3875ZM3.75,14.25a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,3.75,14.25Z"></path>
  </svg>`;
  projectHeader.appendChild(projectIconWrapper);

  const projectTitleGroup = createTag('div', { class: 'project-title-group' });
  const projectTitle = createTag('h3', { class: 'project-title spectrum-Heading spectrum-Heading--sizeM' });
  projectTitle.textContent = 'Project 12';
  projectTitleGroup.appendChild(projectTitle);

  // Product icons
  if (config.components?.Products) {
    const productsRow = createTag('div', { class: 'product-icons' });
    config.components.Products.items?.forEach((item) => {
      const product = item.Product;
      const productIcon = createTag('img', { class: `product-icon icon` , src: product.icon });
      productsRow.appendChild(productIcon);
    });
    projectTitleGroup.appendChild(productsRow);
  }

  projectHeader.appendChild(projectTitleGroup);
  projectCard.appendChild(projectHeader);

  // Divider
  const divider1 = createTag('div', { class: 'card-divider' });
  projectCard.appendChild(divider1);

  // Developer Console Project section
  if (config.components?.DevConsoleLink) {
    const devConsoleSection = createTag('div', { class: 'dev-console-section' });
    const devConsoleLabel = createTag('h3', { class: 'section-label spectrum-Heading spectrum-Heading--sizeS' });
    devConsoleLabel.textContent = config.components.DevConsoleLink.heading;
    devConsoleSection.appendChild(devConsoleLabel);

    const projectLink = createTag('div', { class: 'project-link spectrum-Body spectrum-Body--sizeS ' });
    projectLink.innerHTML = `<a target="_blank" href="/console/projects/248947/4566206088344878645/overview" data-cy="credentialName-link" class="css-1mh8qvr-DevConsoleLink"><div><p class="spectrum-Body spectrum-Body--sizeS css-1bwr9ed-DevConsoleLink">Project 13</p></div><div class="css-4r6gmh-DevConsoleLink">${EXTERNAL_LINK_SVG}</div></a>`;
    devConsoleSection.appendChild(projectLink);

    projectCard.appendChild(devConsoleSection);

  }

  cardContent.appendChild(projectCard);

  // Credential Details section (part of the same card)
  if (config.components?.CredentialDetails) {
    const credentialSection = createTag('div', { class: 'credential-section' });
    const credentialTitle = createTag('h3', { class: "spectrum-Heading spectrum-Heading--sizeS" });
    credentialTitle.textContent = config.components.CredentialDetails.heading;
    credentialSection.appendChild(credentialTitle);

    // API Key
    if (config.components.CredentialDetails.components?.APIKey) {
      const apiKeyField = createTag('div', { class: 'credential-detail-field' });
      const apiKeyLabel = createTag('label', { class: 'credential-detail-label spectrum-Body spectrum-Body--sizeS' });
      apiKeyLabel.textContent = config.components.CredentialDetails.components.APIKey.heading;

      const apiKeyValue = createTag('div', { class: 'credential-detail-value-wrapper' });
      const apiKeyInput = createTag('div', {
        class: 'credential-detail-value'
      });
      apiKeyInput.textContent = '8c6d7ac6d1484f698a331a47c6e38bfae3';
      const copyButton = createTag('button', {
        class: 'copy-button spectrum-ActionButton spectrum-ActionButton--sizeM',
        'data-copy': '8c6d7ac6d1484f698a331a47c6e38bfae3'
      });
      copyButton.innerHTML = COPY_ICON_SVG;

      apiKeyValue.appendChild(apiKeyInput);
      apiKeyValue.appendChild(copyButton);
      apiKeyField.appendChild(apiKeyLabel);
      apiKeyField.appendChild(apiKeyValue);
      credentialSection.appendChild(apiKeyField);
    }


    if (config.components.CredentialDetails.components?.AllowedOrigins) {
      const allowedOrigins = createTag('div', { class: 'credential-detail-field' });
      const allowedOriginLabel = createTag('label', { class: 'credential-detail-label spectrum-Body spectrum-Body--sizeS' });
      allowedOriginLabel.textContent = config.components.CredentialDetails.components.AllowedOrigins.heading;

      const allowedOriginKey = createTag('div', { class: 'credential-detail-value-wrapper' });
      const allowedOriginInput = createTag('div', {
        class: 'credential-detail-value'
      });
      allowedOriginInput.textContent = 'localhost:3000';
      const copyButton = createTag('button', {
        class: 'copy-button spectrum-ActionButton spectrum-ActionButton--sizeM',
        'data-copy': 'localhost:3000'
      });
      copyButton.innerHTML = COPY_ICON_SVG;

      allowedOriginKey.appendChild(allowedOriginInput);
      allowedOriginKey.appendChild(copyButton);
      allowedOrigins.appendChild(allowedOriginLabel);
      allowedOrigins.appendChild(allowedOriginKey);
      credentialSection.appendChild(allowedOrigins);
    }

    // Organization
    if (config.components.CredentialDetails.components?.OrganizationName) {
      const orgField = createTag('div', { class: 'credential-detail-field' });
      const orgLabel = createTag('label', { class: 'credential-detail-label spectrum-Body spectrum-Body--sizeS' });
      orgLabel.textContent = config.components.CredentialDetails.components.OrganizationName.heading;

      const orgValue = createTag('div', { class: 'credential-detail-text' });
      orgValue.textContent = 'deepesh-testusr2-adobetest.com';
      orgField.appendChild(orgLabel);
      orgField.appendChild(orgValue);
      credentialSection.appendChild(orgField);
    }

    projectCard.appendChild(credentialSection);
  }

  // Buttons section (inside project card)
  const buttonsSection = createTag('div', { class: 'card-buttons' });

  // Next steps button
  if (config.nextStepsLabel && config.nextStepsHref) {
    const nextStepsButton = createTag('a', {
      class: 'spectrum-Button spectrum-Button--outline spectrum-Button--primary spectrum-Button--sizeM',
      href: config.nextStepsHref
    });
    const buttonLabel = createTag('span', { class: 'spectrum-Button-label' });
    buttonLabel.textContent = config.nextStepsLabel;
    nextStepsButton.appendChild(buttonLabel);
    buttonsSection.appendChild(nextStepsButton);
  }

  // Manage on Developer console link
  const manageLink = createTag('a', {
    class: 'manage-link',
    href: 'https://developer.adobe.com/console/',
    target: '_blank'
  });

  const manageLinkText = createTag('div', { class: 'spectrum-Body spectrum-Body--sizeS' });
  manageLinkText.textContent = 'Manage on Developer console';
  manageLink.appendChild(manageLinkText);

  const manageLinkIcon = createTag('div', { class: 'manage-link-icon' });
  manageLinkIcon.innerHTML = EXTERNAL_LINK_SVG;
  manageLink.appendChild(manageLinkIcon);

  buttonsSection.appendChild(manageLink);

  projectCard.appendChild(buttonsSection);

  // Add the complete project card to content
  cardContent.appendChild(projectCard);

  // Need another credential section
  const needCredentialSection = createTag('div', { class: 'need-credential' });
  const needCredentialTitle = createTag('div', { class: 'need-credential-title' });
  needCredentialTitle.textContent = 'Need another credential';
  needCredentialSection.appendChild(needCredentialTitle);

  const restartLink = createTag('a', {
    class: 'restart-link',
    href: '#'
  });
  restartLink.textContent = 'Restart and create a new credential';
  needCredentialSection.appendChild(restartLink);

  cardContent.appendChild(needCredentialSection);

  cardWrapper.appendChild(cardContent);

  // Side content
  if (config.components?.Side) {
    cardWrapper.appendChild(separator());
    const sideContent = createSideContent(config.components.Side);
    sideContent.classList.add('card-side-content');
    cardWrapper.appendChild(sideContent);
  }

  cardContainer.appendChild(cardWrapper);
  return cardContainer;
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

  // Create return container (previously created projects)
  let returnContainer;
  if (credentialData.Return) {
    returnContainer = createTag('div', { class: 'return-container hidden' });
    returnContainer.appendChild(createReturnContent(credentialData.Return));
    block.appendChild(returnContainer);
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
    changeOrgLink.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = createOrganizationModal();
      document.body.appendChild(modal);
    });
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

    const cancelButton = createTag('a', { href: '#', class: 'cancel-link' });
    cancelButton.textContent = 'Cancel';

    formButtons.appendChild(createButton);
    formButtons.appendChild(cancelButton);
    formFields.appendChild(formButtons);
    formWrapper.appendChild(formFields);

    if (components?.Side) {
      formWrapper.appendChild(separator());
      formWrapper.appendChild(createSideContent(components.Side));
    }

    formContainer.appendChild(formHeader);
    formContainer.appendChild(formWrapper);
    block.appendChild(formContainer);
  }

  // Create success card container
  let cardContainer;
  if (credentialData.Card) {
    cardContainer = createTag('div', { class: 'credential-card-wrapper hidden' });
    cardContainer.appendChild(createCredentialCard(credentialData.Card));
    block.appendChild(cardContainer);
  }

  // Sign-in button handler - shows return page
  if (signInContainer && returnContainer) {
    const signInButton = signInContainer.querySelector('.sign-in-button');
    if (signInButton) {
      signInButton.addEventListener('click', () => {
        signInContainer.classList.add('hidden');
        returnContainer.classList.remove('hidden');
        // window.adobeIMS.signIn();
      });
    }
  }

  // Create new credential button handler - shows form page
  if (returnContainer && formContainer) {
    const createNewButton = returnContainer.querySelector('.create-new-button');
    if (createNewButton) {
      createNewButton.addEventListener('click', () => {
        returnContainer.classList.add('hidden');
        formContainer.classList.remove('hidden');
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // Create credential button handler - shows success card
  if (formContainer && cardContainer) {
    const createButton = formContainer.querySelector('.create-button');
    if (createButton) {
      createButton.addEventListener('click', (e) => {
        e.preventDefault();
        // Validate form here if needed

        // Hide form and show success card
        formContainer.classList.add('hidden');
        cardContainer.classList.remove('hidden');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Cancel button handler - goes back to return page
    const cancelButton = formContainer.querySelector('.cancel-link');
    if (cancelButton) {
      cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        formContainer.classList.add('hidden');
        if (returnContainer) {
          returnContainer.classList.remove('hidden');
        }
      });
    }
  }

  // Restart and create new credential link handler
  if (cardContainer && formContainer) {
    const restartLink = cardContainer.querySelector('.restart-link');
    if (restartLink) {
      restartLink.addEventListener('click', (e) => {
        e.preventDefault();
        cardContainer.classList.add('hidden');
        formContainer.classList.remove('hidden');
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // Copy button functionality for API key
  document.addEventListener('click', (e) => {
    if (e.target.closest('.copy-button')) {
      const button = e.target.closest('.copy-button');
      const textToCopy = button.getAttribute('data-copy');
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2000);
      });
    }
  });
}
