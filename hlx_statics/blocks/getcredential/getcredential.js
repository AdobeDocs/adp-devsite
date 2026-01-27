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
  createCredentialDetailField,
  createSpectrumButton,
  createExternalLink,
  createDivider,
  createProjectHeader,
  createCredentialSection,
  createOrgNotice,
  separator
} from "./getcredential-components.js";

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

const ALERT_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><rect id="Canvas" fill="rgb(211, 21, 16)" opacity="0" width="18" height="18"></rect><path fill="rgb(211, 21, 16)" d="M8.5635,1.2895.2,16.256A.5.5,0,0,0,.636,17H17.364a.5.5,0,0,0,.436-.744L9.4365,1.2895a.5.5,0,0,0-.873,0ZM10,14.75a.25.25,0,0,1-.25.25H8.25A.25.25,0,0,1,8,14.75v-1.5A.25.25,0,0,1,8.25,13h1.5a.25.25,0,0,1,.25.25Zm0-3a.25.25,0,0,1-.25.25H8.25A.25.25,0,0,1,8,11.75v-6a.25.25,0,0,1,.25-.25h1.5a.25.25,0,0,1,.25.25Z"></path></svg>';

const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|localhost$/;
const credentialNameRegex = /^(?=[A-Za-z0-9\s]{6,}$)[A-Za-z0-9\s]*$/;

function validateDomain(domainToCheck) {
  if (domainToCheck.includes(':')) {
    const domainsSplit = domainToCheck.split(':');
    if (domainsSplit.length !== 2) {
      return false;
    }

    // Port is only allowed for localhost
    if (domainsSplit[0] !== 'localhost') {
      return false;
    }

    try {
      const port = parseInt(domainsSplit[1]);
      if (!port || port < 1024 || port > 65535) {
        return false;
      }
    } catch (e) {
      return false;
    }

    domainToCheck = domainsSplit[0];
  }
  return domainPattern.test(domainToCheck);
}

function handleAllowedDomainsValidation(value) {
  if (!value || value.trim() === '') {
    return { valid: true, errors: [] };
  }

  const domains = value.split(',');
  const errors = [];

  if (domains.length > 5) {
    errors.push('A maximum of 5 domains are allowed');
  }

  domains.forEach((domain) => {
    let domainToCheck = domain.trim();
    if (domainToCheck.startsWith('*.')) {
      domainToCheck = domainToCheck.substring(2);
    }
    if (!validateDomain(domainToCheck)) {
      errors.push(`Domain ${domain.trim()} is invalid`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateCredentialName(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: '' };
  }

  const isValid = credentialNameRegex.test(value);
  const error = isValid ? '' : 'Credential name must be unique and between 6 and 45 characters long and must not contain any special characters. A project will be automatically created with the same name in Adobe Developer Console.';

  return { valid: isValid, error };
}

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

const validationState = {
  CredentialName: { valid: false, error: '' },
  AllowedOrigins: { valid: true, errors: [] }
};

function handleInputChange(value, fieldName) {
  formData[fieldName] = value;
  const counter = fieldName === 'CredentialName' && document.querySelector(`[data-counter="${fieldName}"]`);
  if (counter) counter.textContent = parseInt(counter.getAttribute('data-max')) - value.length;

  // Validate and update UI
  if (fieldName === 'CredentialName') {
    const validation = validateCredentialName(value);
    validationState.CredentialName = validation;
    updateFieldValidation('CredentialName', validation);
  } else if (fieldName === 'AllowedOrigins') {
    const validation = handleAllowedDomainsValidation(value);
    validationState.AllowedOrigins = validation;
    updateFieldValidation('AllowedOrigins', validation);
  }

  updateButtonState();
}

function updateFieldValidation(fieldName, validation) {
  const input = document.querySelector(fieldName === 'CredentialName' ? 
    '[data-cy="add-credential-name"]' : 
    '[data-cy="add-allowed-origins"]');
  
  if (!input) return;

  const fieldContainer = input.closest('.form-field');
  const descriptionElement = fieldContainer?.querySelector('.field-description');
  const alertIcon = fieldContainer?.querySelector('.alert-icon');

  if (validation.error || validation.errors?.length) {
    // Show error - just change color by adding error class
    input.classList.add('error');
    if (descriptionElement) {
      descriptionElement.classList.add('error');
    }
    // Show alert icon for credential name field
    if (alertIcon && fieldName === 'CredentialName') {
      alertIcon.style.display = 'block';
    }
  } else {
    // Remove error - restore original color
    input.classList.remove('error');
    if (descriptionElement) {
      descriptionElement.classList.remove('error');
    }
    // Hide alert icon
    if (alertIcon && fieldName === 'CredentialName') {
      alertIcon.style.display = 'none';
    }
  }
}

function updateButtonState() {
  const createButton = document.querySelector('.create-button');
  if (!createButton) return;

  const isCredentialNameValid = validationState.CredentialName.valid;
  const isAllowedOriginsValid = validationState.AllowedOrigins.valid;
  const isCredentialNameFilled = formData.CredentialName.trim() !== '';
  const isAgreementChecked = formData.AdobeDeveloperConsole;

  const shouldDisable = !isCredentialNameFilled || !isCredentialNameValid || !isAllowedOriginsValid || !isAgreementChecked;

  if (shouldDisable) {
    createButton.setAttribute('disabled', 'true');
    createButton.style.opacity = '0.4';
    createButton.style.cursor = 'not-allowed';
  } else {
    createButton.removeAttribute('disabled');
    createButton.style.opacity = '1';
    createButton.style.cursor = 'pointer';
  }
}

// ============================================================================
// FORM FIELD HELPER
// ============================================================================

function addDescription(container, text) {
  if (text) {
    const desc = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS field-description' });
    desc.textContent = text;
    container.appendChild(desc);
  }
}

// ============================================================================
// FORM FIELD COMPONENTS
// ============================================================================

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

  // Input wrapper for positioning alert icon
  const inputWrapper = createTag('div', { class: 'input-wrapper' });
  
  const input = createTag('input', {
    type: 'text',
    class: 'credential-input',
    placeholder: config.placeholder || '',
    maxlength: config.range || '',
    'data-cy': 'add-credential-name',
    required: true
  });
  input.addEventListener('input', (e) => handleInputChange(e.target.value, 'CredentialName'));
  inputWrapper.appendChild(input);

  // Alert icon (hidden by default)
  const alertIcon = createTag('span', { 
    class: 'alert-icon',
    'data-field': 'CredentialName'
  });
  alertIcon.innerHTML = ALERT_ICON_SVG;
  alertIcon.style.display = 'none';
  inputWrapper.appendChild(alertIcon);

  fieldContainer.appendChild(inputWrapper);
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
    const languageSection = fieldContainer.querySelector('.language-section');
    if (downloadOptions) downloadOptions.style.display = e.target.checked ? 'flex' : 'none';
    if (languageSection) languageSection.style.display = e.target.checked ? 'block' : 'none';
  });

  checkboxWrapper.appendChild(checkbox);
  checkboxWrapper.appendChild(createFieldLabel(config, 'downloads-checkbox', true));
  fieldContainer.appendChild(checkboxWrapper);

  console.log(config.items)
  if (config.items?.length > 1) {
    const downloadOptions = createTag('div', { class: 'download-options', style: 'display: none;' });
    const downloadOptionsLabel = createTag('label', { class: 'spectrum-Body spectrum-Body--sizeS field-label' });
    downloadOptionsLabel.textContent = 'Language';
    downloadOptions.appendChild(downloadOptionsLabel);
    const downloadOptionsList = createTag('select', {
      class: 'download-options-list',
      'data-cy': 'download-options-list'
    });

    // Populate dropdown with download options
    config.items.forEach((item, index) => {
      const download = item.Download;
      const option = createTag('option', { 
        value: download.href,
        'data-index': index
      });
      option.textContent = download.title;
      if (index === 0) {
        option.selected = true;
        formData.Download = download;
      }
      downloadOptionsList.appendChild(option);
    });

    // Handle dropdown change
    downloadOptionsList.addEventListener('change', (e) => {
      const selectedIndex = e.target.options[e.target.selectedIndex].getAttribute('data-index');
      formData.Download = config.items[selectedIndex].Download;
    });

    downloadOptions.appendChild(downloadOptionsList);
    fieldContainer.appendChild(downloadOptions);

    // Add Language field if languages are provided
    if (config.languages?.length) {
      const languageSection = createTag('div', { class: 'language-section', style: 'display: none;' });
      
      const languageLabel = createTag('label', { class: 'spectrum-Body spectrum-Body--sizeS field-label' });
      languageLabel.textContent = 'Language';
      languageSection.appendChild(languageLabel);

      // If only one language, show as plain text
      if (config.languages.length === 1) {
        const languageText = createTag('div', { class: 'language-text' });
        languageText.textContent = config.languages[0];
        formData.Language = config.languages[0];
        languageSection.appendChild(languageText);
      } else {
        // If multiple languages, show as dropdown
        const languageDropdown = createTag('select', { 
          class: 'language-dropdown',
          'data-cy': 'language-dropdown'
        });

        config.languages.forEach((language, index) => {
          const option = createTag('option', { value: language });
          option.textContent = language;
          if (index === 0) option.selected = true;
          languageDropdown.appendChild(option);
        });

        languageDropdown.addEventListener('change', (e) => {
          formData.Language = e.target.value;
        });

        // Set initial value
        formData.Language = config.languages[0];

        languageSection.appendChild(languageDropdown);
      }

      fieldContainer.appendChild(languageSection);
    }
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
      productItem.appendChild(createTag('img', { class: `product-icon icon`, src: product.icon }));
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

  const button = createSpectrumButton('Sign in to create credentials', 'outline', 'M');
  button.classList.add('sign-in-button');
  button.setAttribute('data-cy', 'sign-in-button');
  signInWrapper.appendChild(button);

  return signInWrapper;
}

// ============================================================================
// RETURN PAGE (Previously Created Projects)
// ============================================================================
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
  getCredHeader.appendChild(createOrgNotice("You're viewing in your personal developer organization  ", 'org-notice-return'));

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

      const button = createSpectrumButton(config.components.Side.components.NewCredential.buttonLabel, 'accent', 'M');
      button.classList.add('create-new-button');
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
    const manageConsoleLink = createExternalLink(
      config.components.ManageDeveloperConsole.label,
      config.components.ManageDeveloperConsole.direction
    );
    manageConsoleLink.classList.remove('project-link');
    manageConsoleLink.classList.add('manage-console-link');
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
  projectCard.appendChild(createProjectHeader('Project 17', config.components?.Products));

  // Divider
  projectCard.appendChild(createDivider());

  // Developer Console Project
  if (config.components?.DevConsoleLink) {
    const devConsoleSection = createTag('div', { class: 'dev-console-section' });
    const devConsoleLabel = createTag('h3', { class: 'section-label spectrum-Heading spectrum-Heading--sizeS' });
    devConsoleLabel.textContent = config.components.DevConsoleLink.heading;
    devConsoleSection.appendChild(devConsoleLabel);

    const projectLink = createExternalLink('Project 17', '/console/projects/248947/4566206088344878645/overview');
    devConsoleSection.appendChild(projectLink);
    projectCard.appendChild(devConsoleSection);
  }

  // Credential Details
  if (config.components?.CredentialDetails) {
    projectCard.appendChild(createCredentialSection(config.components.CredentialDetails));
  }

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
  projectCard.appendChild(createProjectHeader('Project 12', config.components?.Products));
  projectCard.appendChild(createDivider());

  // Developer Console Project section
  if (config.components?.DevConsoleLink) {
    const devConsoleSection = createTag('div', { class: 'dev-console-section' });
    const devConsoleLabel = createTag('h3', { class: 'section-label spectrum-Heading spectrum-Heading--sizeS' });
    devConsoleLabel.textContent = config.components.DevConsoleLink.heading;
    devConsoleSection.appendChild(devConsoleLabel);

    const projectLink = createExternalLink('Project 13', '/console/projects/248947/4566206088344878645/overview');
    projectLink.setAttribute('data-cy', 'credentialName-link');
    devConsoleSection.appendChild(projectLink);

    projectCard.appendChild(devConsoleSection);

  }

  cardContent.appendChild(projectCard);

  // Credential Details section
  if (config.components?.CredentialDetails) {
    const credSection = createCredentialSection(config.components.CredentialDetails);
    // Override values for card page
    const apiKeyField = credSection.querySelector('.credential-detail-value');
    if (apiKeyField) apiKeyField.textContent = '8c6d7ac6d1484f698a331a47c6e38bfae3';
    projectCard.appendChild(credSection);
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
  const manageLink = createExternalLink('Manage on Developer console', 'https://developer.adobe.com/console/');
  manageLink.classList.remove('project-link');
  manageLink.classList.add('manage-link');
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
    formHeader.appendChild(createOrgNotice("You're creating this credential in your personal developer organization  "));

    const formWrapper = createTag('div', { class: 'form-wrapper' });
    const formFields = createTag('form', { class: 'credential-form' });

    // Add form fields dynamically
    const fieldMapping = {
      CredentialName: createCredentialNameField,
      AllowedOrigins: createAllowedOriginsField,
      Downloads: createDownloadsField,
      Products: createProductsField,
      AdobeDeveloperConsole: createAgreementField
    };
    
    Object.entries(fieldMapping).forEach(([key, fn]) => {
      if (components?.[key]) formFields.appendChild(fn(components[key]));
    });

    // Form buttons
    const formButtons = createTag('div', { class: 'form-buttons' });
    const createButton = createSpectrumButton('Create credential', 'accent', 'M', 'submit');
    createButton.classList.add('create-button');
    createButton.setAttribute('data-cy', 'create-credential-btn');
    // Start disabled
    createButton.setAttribute('disabled', 'true');
    createButton.style.opacity = '0.4';
    createButton.style.cursor = 'not-allowed';

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

  // Navigation helper function
  const navigateTo = (hideEl, showEl, scroll = false) => {
    hideEl?.classList.add('hidden');
    showEl?.classList.remove('hidden');
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Setup navigation handlers
  signInContainer?.querySelector('.sign-in-button')?.addEventListener('click', () => {
    navigateTo(signInContainer, returnContainer);
  });

  returnContainer?.querySelector('.create-new-button')?.addEventListener('click', () => {
    navigateTo(returnContainer, formContainer, true);
  });

  formContainer?.querySelector('.create-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const isCredentialNameValid = validationState.CredentialName.valid;
    const isAllowedOriginsValid = validationState.AllowedOrigins.valid;
    const isCredentialNameFilled = formData.CredentialName.trim() !== '';
    const isAgreementChecked = formData.AdobeDeveloperConsole;

    if (!isCredentialNameFilled || !isCredentialNameValid || !isAllowedOriginsValid || !isAgreementChecked) {
      // Don't proceed if validation fails
      return;
    }

    navigateTo(formContainer, cardContainer, true);
  });

  formContainer?.querySelector('.cancel-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(formContainer, returnContainer);
  });

  cardContainer?.querySelector('.restart-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(cardContainer, formContainer, true);
  });

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
