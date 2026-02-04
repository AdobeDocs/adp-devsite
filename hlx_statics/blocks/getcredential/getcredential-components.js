/**
 * Reusable component functions for Get Credential block
 */

import { createTag } from "../../scripts/lib-adobeio.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const HELP_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18"></rect><path d="M10.09064,12.966a.9167.9167,0,0,1-.97722,1.0076.93092.93092,0,0,1-.97769-1.0076.97756.97756,0,0,1,1.95491-.02931Q10.09085,12.95135,10.09064,12.966ZM8.97658,4a4.61617,4.61617,0,0,0-2.2591.5362c-.05924.03139-.05924.09215-.05924.15342V6.17521a.07459.07459,0,0,0,.11854.06076,3.69224,3.69224,0,0,1,1.87246-.50481c.90632,0,1.26328.38278,1.26328.93417,0,.47493-.28253.79645-.77259,1.30176C8.42665,8.70278,7.99526,9.1615,7.99526,9.8815a1.70875,1.70875,0,0,0,.357,1.05721A.244.244,0,0,0,8.54519,11h1.2929a.06531.06531,0,0,0,.05931-.10734,1.65129,1.65129,0,0,1-.23779-.843c0-.45874.54994-.96405,1.12955-1.53113a2.73714,2.73714,0,0,0,.95107-2.1129C11.74024,5.05774,10.75955,4,8.97658,4ZM17.5,9A8.5,8.5,0,1,1,9,.50005H9A8.5,8.5,0,0,1,17.5,9ZM15.6748,9A6.67481,6.67481,0,1,0,9,15.67476H9A6.67476,6.67476,0,0,0,15.6748,9Z"></path></svg>';

export const COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><rect height="1" rx="0.25" width="1" x="16" y="11"></rect><rect height="1" rx="0.25" width="1" x="16" y="9"></rect><rect height="1" rx="0.25" width="1" x="16" y="7"></rect><rect height="1" rx="0.25" width="1" x="16" y="5"></rect><rect height="1" rx="0.25" width="1" x="16" y="3"></rect><rect height="1" rx="0.25" width="1" x="16" y="1"></rect><rect height="1" rx="0.25" width="1" x="14" y="1"></rect><rect height="1" rx="0.25" width="1" x="12" y="1"></rect><rect height="1" rx="0.25" width="1" x="10" y="1"></rect><rect height="1" rx="0.25" width="1" x="8" y="1"></rect><rect height="1" rx="0.25" width="1" x="6" y="1"></rect><rect height="1" rx="0.25" width="1" x="6" y="3"></rect><rect height="1" rx="0.25" width="1" x="6" y="5"></rect><rect height="1" rx="0.25" width="1" x="6" y="7"></rect><rect height="1" rx="0.25" width="1" x="6" y="9"></rect><rect height="1" rx="0.25" width="1" x="6" y="11"></rect><rect height="1" rx="0.25" width="1" x="8" y="11"></rect><rect height="1" rx="0.25" width="1" x="10" y="11"></rect><rect height="1" rx="0.25" width="1" x="12" y="11"></rect><rect height="1" rx="0.25" width="1" x="14" y="11"></rect><path d="M5,6H1.5a.5.5,0,0,0-.5.5v10a.5.5,0,0,0,.5.5h10a.5.5,0,0,0,.5-.5V13H5.5a.5.5,0,0,1-.5-.5Z"></path></svg>';

export const EXTERNAL_LINK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18"></rect><path d="M16.5,9h-1a.5.5,0,0,0-.5.5V15H3V3H8.5A.5.5,0,0,0,9,2.5v-1A.5.5,0,0,0,8.5,1h-7a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5v-7A.5.5,0,0,0,16.5,9Z"></path><path d="M16.75,1H11.377A.4.4,0,0,0,11,1.4a.392.392,0,0,0,.1175.28l1.893,1.895L9.4895,7.096a.5.5,0,0,0-.00039.70711l.00039.00039.707.707a.5.5,0,0,0,.707,0l3.5215-3.521L16.318,6.882A.39051.39051,0,0,0,16.6,7a.4.4,0,0,0,.4-.377V1.25A.25.25,0,0,0,16.75,1Z"></path></svg>';

export const PROJECT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 18 18" width="32" fill="var(--spectrum-global-color-gray-700)">
  <path d="M17.761,4.3875,14.53,1.156a.75.75,0,0,0-1.06066-.00034L13.469,1.156,6.5885,8.0365A4.45,4.45,0,0,0,4.5,7.5,4.5,4.5,0,1,0,9,12a4.45,4.45,0,0,0-.5245-2.0665l3.363-3.363,1.87,1.87a.375.375,0,0,0,.53033.00017L14.239,8.4405l1.672-1.672L13.776,4.633l.6155-.6155,2.135,2.1355L17.761,4.918A.37543.37543,0,0,0,17.761,4.3875ZM3.75,14.25a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,3.75,14.25Z"></path>
</svg>`;

const TOAST_ICONS = {
  error: '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><path fill="#fff" d="M8.5635,1.2895.2,16.256A.5.5,0,0,0,.636,17H17.364a.5.5,0,0,0,.436-.744L9.4365,1.2895a.5.5,0,0,0-.873,0ZM10,14.75a.25.25,0,0,1-.25.25H8.25A.25.25,0,0,1,8,14.75v-1.5A.25.25,0,0,1,8.25,13h1.5a.25.25,0,0,1,.25.25Zm0-3a.25.25,0,0,1-.25.25H8.25A.25.25,0,0,1,8,11.75v-6a.25.25,0,0,1,.25-.25h1.5a.25.25,0,0,1,.25.25Z"></path></svg>',
  success: '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><path fill="#fff" d="M9,1A8,8,0,1,0,17,9,8,8,0,0,0,9,1ZM14.3335,7.0165l-6.359,6.359a.5.5,0,0,1-.707,0L3.6665,9.7735a.5.5,0,0,1,.707-.707L7.621,12.314l6.0055-6.0055a.5.5,0,1,1,.707.707Z"></path></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18"><path fill="#fff" d="M9,1A8,8,0,1,0,17,9,8,8,0,0,0,9,1Zm.5,12.5a.5.5,0,0,1-.5.5H8.5a.5.5,0,0,1-.5-.5v-5a.5.5,0,0,1,.5-.5H9a.5.5,0,0,1,.5.5ZM9,6.5A.75.75,0,1,1,9.75,5.75.75.75,0,0,1,9,6.5Z"></path></svg>',
};

const CLOSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 16 16" width="16"><path fill="#fff" d="M14.6464,13.3536a.5.5,0,0,0,.7072-.7072L8.707,6l6.6464-6.6464a.5.5,0,0,0-.7072-.7072L8,5.293,1.3536-1.3536a.5.5,0,0,0-.7072.7072L7.293,6,.6464,12.6464a.5.5,0,0,0,.7072.7072L8,6.707Z"></path></svg>';

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

/**
 * Hide a toast notification with animation
 * @param {Element} toast - The toast element to hide
 */
function hideToast(toast) {
  if (!toast || !toast.parentElement) return;

  toast.classList.add('toast-hiding');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300); // Match animation duration
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} variant - The toast variant: 'error', 'success', 'info', or 'neutral'
 * @param {number} duration - Auto-hide duration in milliseconds (default: 3000)
 */
export function showToast(message, variant = 'neutral', duration = 3000, container = null) {
  // Create toast container
  const toast = createTag('div', { class: `toast-notification toast-${variant}` });

  // Add icon if available
  if (TOAST_ICONS[variant]) {
    const iconDiv = createTag('div', { class: 'toast-icon' });
    iconDiv.innerHTML = TOAST_ICONS[variant];
    toast.appendChild(iconDiv);
  }

  // Add message content
  const content = createTag('div', { class: 'toast-content' });
  content.textContent = message;
  toast.appendChild(content);

  // Add divider
  const divider = createTag('div', { class: 'toast-divider' });
  toast.appendChild(divider);

  // Add close button
  const closeButton = createTag('button', { class: 'toast-close-button' });
  closeButton.innerHTML = CLOSE_ICON;
  closeButton.addEventListener('click', () => hideToast(toast));
  toast.appendChild(closeButton);

  // Add to container or body
  if (container) {
    // Make container position relative if not already
    const containerPosition = window.getComputedStyle(container).position;
    if (containerPosition === 'static') {
      container.style.position = 'relative';
    }
    toast.classList.add('toast-in-container');
    container.appendChild(toast);
  } else {
    document.body.appendChild(toast);
  }

  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => hideToast(toast), duration);
  }

  return toast;
}

export async function downloadZipViaApi(downloadAPI, zipPath, downloadFileName = 'download.zip', credentialJSON = null) {
  try {
    // Use getAccessToken() for a fresh valid token instead of getTokenFromStorage()
    const tokenData = await window.adobeIMS?.getAccessToken();
    const token = tokenData?.token || tokenData;
    const apiKey = window?.adobeIMS?.adobeIdData?.client_id;

    console.log('[DOWNLOAD API] Token exists:', token);
    console.log('[DOWNLOAD API] URL:', downloadAPI);
    console.log('[DOWNLOAD API] API Key:', apiKey);


    // const options = {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`,
    //     'x-api-key': apiKey,
    //   },
    // };

    // const jsonResponse = await fetch(downloadAPI, options);
    // console.log('[DOWNLOAD API] Response status:', jsonResponse.status);

    // let credential = null;
    // if (jsonResponse.status === 200) {
    //   credential = await jsonResponse.json();
    // } else {
    //   const errorText = await jsonResponse.text();
    //   console.error('[DOWNLOAD API] Error response:', errorText);
    //   throw new Error(`Download API failed with status ${jsonResponse.status}: ${errorText}`);
    // }

    showToast('Preparing download...', 'info', 2000);

    const response = await fetch(downloadAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        zipPath,
        jsonContent: credentialJSON,
        jsonFileName: 'credential.json',
        downloadFileName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    // Get the blob from response
    const blob = await response.blob();
    console.log('[ZIP API] Received blob, size:', blob.size);

    // Trigger download using native browser approach (no external library needed)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Download started!', 'success', 3000);
    console.log('[ZIP API] Download triggered for:', downloadFileName);

  } catch (error) {
    console.error('[ZIP API] Error:', error);
    showToast('Download failed: ' + error.message, 'error', 5000);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function separator() {
  return createTag('div', { class: 'separator' });
}

function createHelpIcon(config) {
  if (!config.contextHelp) return null;

  const wrapper = createTag('div', { class: 'context-help-wrapper' });
  const button = createTag('button', { class: 'help-icon', type: 'button' });
  button.innerHTML = HELP_ICON_SVG;

  const popover = createTag('div', { class: 'context-help-popover', style: 'display: none;' });

  if (config.contextHelpHeading) {
    const heading = createTag('h4', { class: 'context-help-heading spectrum-Heading spectrum-Heading--sizeXXS' });
    heading.textContent = config.contextHelpHeading;
    popover.appendChild(heading);
  }

  if (config.contextHelpText) {
    const text = createTag('p', { class: 'context-help-text spectrum-Body spectrum-Body--sizeXS' });
    text.textContent = config.contextHelpText;
    popover.appendChild(text);
  }

  if (config.contextHelpLink) {
    const link = createTag('a', {
      class: 'context-help-link',
      href: config.contextHelpLink,
      target: '_blank',
      rel: 'noreferrer'
    });
    link.textContent = config.contextHelpLinkLabel || 'Learn more';
    popover.appendChild(link);
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.context-help-popover').forEach(p => {
      p.style.display = p === popover && popover.style.display !== 'flex' ? 'flex' : 'none';
    });
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) popover.style.display = 'none';
  });

  wrapper.appendChild(button);
  wrapper.appendChild(popover);

  return wrapper;
}

export function createFieldLabel(config, fieldName, isCheckbox = false) {
  const labelDiv = createTag('div', { class: 'label-section' });
  const label = createTag('label', {
    class: `spectrum-Body spectrum-Body--sizeS ${isCheckbox ? 'checkbox-label' : 'field-label'}`,
    ...(fieldName && { for: isCheckbox ? fieldName : `textfield-${fieldName}` })
  });
  label.textContent = config.label;

  if (config.required) {
    const asterisk = createTag('span', { class: 'required-asterisk' });
    asterisk.textContent = ' *';
    label.appendChild(asterisk);
  }

  labelDiv.appendChild(label);
  const helpIcon = createHelpIcon(config);
  if (helpIcon) labelDiv.appendChild(helpIcon);

  return labelDiv;
}

export function createDivider() {
  return createTag('div', { class: 'card-divider' });
}

function createCopyButton(textToCopy) {
  const copyButton = createTag('button', {
    class: 'copy-button spectrum-ActionButton spectrum-ActionButton--sizeM',
    'data-copy': textToCopy
  });
  copyButton.innerHTML = COPY_ICON_SVG;
  return copyButton;
}

export function createSpectrumButton(text, type = 'accent', size = 'M', buttonType = 'button') {
  const typeClass = type === 'outline' ? 'spectrum-Button--outline spectrum-Button--primary' : 'spectrum-Button--fill spectrum-Button--accent';
  const button = createTag('button', {
    class: `spectrum-Button ${typeClass} spectrum-Button--size${size}`,
    type: buttonType
  });
  const buttonLabel = createTag('span', { class: 'spectrum-Button-label' });
  buttonLabel.textContent = text;
  button.appendChild(buttonLabel);
  return button;
}

export function createExternalLink(text, href) {
  const link = createTag('a', {
    class: 'project-link spectrum-Body spectrum-Body--sizeS',
    href: href,
    target: '_blank'
  });
  const textDiv = createTag('div', {});
  const textP = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeS' });
  textP.textContent = text;
  textDiv.appendChild(textP);

  const iconDiv = createTag('div', {});
  iconDiv.innerHTML = EXTERNAL_LINK_SVG;

  link.appendChild(textDiv);
  link.appendChild(iconDiv);
  return link;
}

// ============================================================================
// ORGANIZATION MODAL - Done
// ============================================================================

export function createOrganizationModal(organizations, currentOrg, onOrgChange) {
  const modalOverlay = createTag('div', { class: 'org-modal-overlay' });
  const modal = createTag('div', { class: 'org-modal' });

  // Modal header
  const modalHeader = createTag('div', { class: 'org-modal-header' });
  const modalTitle = createTag('h3', { class: 'spectrum-Heading spectrum-Heading--sizeM' });
  modalTitle.textContent = 'Change organization';
  modalHeader.appendChild(modalTitle);
  modal.appendChild(modalHeader);

  // Modal body
  const modalBody = createTag('div', { class: 'org-modal-body' });
  const currentOrgText = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeS' });
  currentOrgText.innerHTML = `You are currently in <strong class="current-org-text">[${currentOrg?.name || 'Personal Developer Organization'}]</strong>.`;
  modalBody.appendChild(currentOrgText);

  const orgList = createTag('div', { class: 'org-list' });

  const label = createTag('label', { class: 'spectrum-Body spectrum-Body--sizeS org-modal-label' });
  label.textContent = 'Choose organization';
  const requiredSpan = createTag('span', { class: 'required-asterisk' });
  requiredSpan.textContent = '*';
  label.appendChild(requiredSpan);
  orgList.appendChild(label);

  const dropdown = createTag('select', { class: 'spectrum-Picker org-modal-dropdown' });

  // Populate dropdown with organizations
  if (organizations && organizations.length > 0) {
    organizations.forEach((org, index) => {
      const option = createTag('option', { value: org.code || org.id });
      option.textContent = org.name || org.code || `Organization ${index + 1}`;
      if (currentOrg && (org.code === currentOrg.code || org.id === currentOrg.code)) {
        option.selected = true;
      }
      dropdown.appendChild(option);
    });
  } else {
    // Fallback if no organizations provided
    const option = createTag('option', { value: currentOrg?.code || 'default' });
    option.textContent = currentOrg?.name || 'Personal Developer Organization';
    dropdown.appendChild(option);
  }

  orgList.appendChild(dropdown);
  modalBody.appendChild(orgList);
  modal.appendChild(modalBody);

  // Modal footer
  const modalFooter = createTag('div', { class: 'org-modal-footer' });

  const cancelButton = createTag('button', {
    class: 'spectrum-Button spectrum-Button--outline spectrum-Button--secondary spectrum-Button--sizeM org-modal-cancel'
  });
  const cancelLabel = createTag('span', { class: 'spectrum-Button-label' });
  cancelLabel.textContent = 'Cancel';
  cancelButton.appendChild(cancelLabel);

  const changeButton = createTag('button', {
    class: 'spectrum-Button spectrum-Button--fill spectrum-Button--accent spectrum-Button--sizeM org-modal-change'
  });
  const changeLabel = createTag('span', { class: 'spectrum-Button-label' });
  changeLabel.textContent = 'Change organization';
  changeButton.appendChild(changeLabel);

  modalFooter.appendChild(cancelButton);
  modalFooter.appendChild(changeButton);
  modal.appendChild(modalFooter);

  modalOverlay.appendChild(modal);

  // Disable scroll for entire page when modal opens
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  // Close modal only on button clicks
  cancelButton.addEventListener('click', () => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    modalOverlay.remove();
  });

  changeButton.addEventListener('click', () => {
    const selectedOrgCode = dropdown.value;
    const selectedOrg = organizations?.find(org => (org.code || org.id) === selectedOrgCode);

    if (selectedOrg && onOrgChange) {
      onOrgChange(selectedOrg);
    }

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    modalOverlay.remove();
  });

  return modalOverlay;
}

// ============================================================================
// CREDENTIAL DETAILS
// ============================================================================

export function createCredentialDetailField(label, value, showCopy = false, fieldName = null) {
  const field = createTag('div', { class: 'credential-detail-field' });
  const fieldLabel = createTag('label', { class: 'credential-detail-label spectrum-Body spectrum-Body--sizeS' });
  fieldLabel.textContent = label;
  field.appendChild(fieldLabel);

  if (showCopy) {
    const valueWrapper = createTag('div', { class: 'credential-detail-value-wrapper' });
    const valueDiv = createTag('div', { class: 'credential-detail-value' });
    valueDiv.textContent = value;

    // Add data-field attribute for dynamic updates
    if (fieldName) {
      valueDiv.setAttribute('data-field', fieldName);
    }

    valueWrapper.appendChild(valueDiv);
    valueWrapper.appendChild(createCopyButton(value));
    field.appendChild(valueWrapper);
  } else {
    const valueText = createTag('div', { class: 'credential-detail-text' });
    valueText.textContent = value;

    // Add data-field attribute for dynamic updates
    if (fieldName) {
      valueText.setAttribute('data-field', fieldName);
    }

    field.appendChild(valueText);
  }

  return field;
}

export function createProjectHeader(projectTitle, products) {
  const projectHeader = createTag('div', { class: 'return-project-header' });

  const projectIconWrapper = createTag('div', { class: 'project-icon' });
  projectIconWrapper.innerHTML = PROJECT_ICON_SVG;
  projectHeader.appendChild(projectIconWrapper);

  const projectTitleGroup = createTag('div', { class: 'project-title-group' });
  const title = createTag('h3', { class: 'project-title spectrum-Heading spectrum-Heading--sizeM' });
  title.textContent = projectTitle;
  projectTitleGroup.appendChild(title);

  // Handle both array of icon URLs and products object with items
  const productItems = products?.items || (Array.isArray(products) ? products : null);
  if (productItems?.length) {
    const productsRow = createTag('div', { class: 'product-icons' });
    productItems.forEach((item) => {
      const iconSrc = typeof item === 'string' ? item : item.Product?.icon;
      if (iconSrc) {
        const productIcon = createTag('img', { class: 'product-icon icon', src: iconSrc });
        productsRow.appendChild(productIcon);
      }
    });
    projectTitleGroup.appendChild(productsRow);
  }

  projectHeader.appendChild(projectTitleGroup);
  return projectHeader;
}

export function createCredentialSection(config) {
  const credentialSection = createTag('div', { class: 'credential-section' });
  const credentialTitle = createTag('h3', { class: 'spectrum-Heading spectrum-Heading--sizeS' });
  credentialTitle.textContent = config.heading;
  credentialSection.appendChild(credentialTitle);

  const components = config.components;
  if (components?.APIKey) {
    credentialSection.appendChild(createCredentialDetailField(
      components.APIKey.heading,
      components.APIKey.value || '',
      true,
      'apiKey'  // Add fieldName for dynamic updates
    ));
  }

  if (components?.AllowedOrigins) {
    credentialSection.appendChild(createCredentialDetailField(
      components.AllowedOrigins.heading,
      components.AllowedOrigins.value || '',
      true,
      'allowedOrigins'  // Add fieldName for dynamic updates
    ));
  }

  if (components?.OrganizationName) {
    credentialSection.appendChild(createCredentialDetailField(
      components.OrganizationName.heading,
      components.OrganizationName.value || '',
      false,
      'organization'  // Add fieldName for dynamic updates
    ));
  }

  return credentialSection;
}

export function createOrgNotice(text, className = 'org-notice', organizationsData = null, currentOrg = null, onOrgChange = null) {
  const orgNotice = createTag('div', { class: className });
  const orgText = createTag('span', { class: 'org-text' });
  orgText.textContent = text;

  const changeOrgLink = createTag('a', { class: 'change-org-link', href: '#' });
  changeOrgLink.textContent = 'Change organization';
  changeOrgLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.appendChild(createOrganizationModal(organizationsData, currentOrg, onOrgChange));
  });

  orgNotice.appendChild(orgText);
  orgNotice.appendChild(changeOrgLink);
  return orgNotice;
}
