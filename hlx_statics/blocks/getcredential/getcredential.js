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
  separator,
  showToast,
  downloadZIP
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

// Store API response data
let credentialResponse = null;
let templateData = null;
let selectedOrganization = null;
let organizationsData = null;
const token = window.adobeIMS?.getTokenFromStorage()?.token;

// Local storage key for organization
const LOCAL_STORAGE_ORG_KEY = 'adobe_selected_organization';

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function createCredential() {
  if (!token) {
    console.error('[CREATE CREDENTIAL] User not logged in');
    throw new Error('Please sign in to create credentials');
  }

  if (!templateData) {
    console.error('[CREATE CREDENTIAL] Template data not available');
    throw new Error('Template configuration missing');
  }

  // Prepare APIs data
  const apis = templateData.apis?.map(api => ({
    code: api.code,
    credentialType: api.credentialType,
    flowType: api.flowType,
    licenseConfigs: Array.isArray(api.licenseConfigs) && api.licenseConfigs.length > 0
      ? [{ ...api.licenseConfigs[0], op: 'add' }]
      : [],
  })) || [];

  const data = {
    projectName: formData.CredentialName,
    description: 'created for get credential',
    metadata: {
      domain: formData.AllowedOrigins,
    },
    orgId: selectedOrganization?.code || templateData.orgId,
    apis,
  };

  const url = `/templates/install/${templateData.id}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const resResp = await response?.json();
  if (response.ok) {
    return { success: true, data: resResp };
  } else {
    // Parse error message
    let errorMessage = 'Failed to create credential';
    if (resResp.errors && resResp.errors.length > 0) {
      const errorText = resResp.errors[0].message;
      const jsonMatch = errorText.match(/\((\{.*\})\)/);
      if (jsonMatch) {
        const errorDetails = JSON.parse(jsonMatch[1]);
        errorMessage = errorDetails.messages[0]?.message || errorMessage;
      } else {
        errorMessage = errorText;
      }
    }
    console.error('[CREATE CREDENTIAL] Error:', errorMessage);
    throw new Error(errorMessage);
  }
}

async function fetchExistingCredentials(orgCode) {
  const token = window.adobeIMS?.getTokenFromStorage()?.token;

  if (!token) {
    console.error('[FETCH EXISTING CREDENTIALS] No token available');
    return null;
  }

  // Use selected organization if available
  const selectedOrgCode = orgCode || selectedOrganization?.id;
  const templateId = templateData?.id;

  try {
    // Get user profile for userId
    const profile = await window.adobeIMS?.getProfile();
    const userId = profile?.userId;

    if (!selectedOrgCode || !templateId || !userId) {
      console.error('[FETCH EXISTING CREDENTIALS] Missing required parameters:', { selectedOrgId, templateId, userId });
      return null;
    }

    // Fetch user's projects/credentials using search endpoint
    const url = `/console/api/organizations/${selectedOrgCode}/search/projects?templateId=${templateId}&createdBy=${userId}&excludeUserProfiles=true&skipReadOnlyCheck=true`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('[FETCH CREDENTIALS] Failed with status:', response.status);
    }
  } catch (error) {
    console.error('[FETCH CREDENTIALS] Error:', error);
  }

  return null;
}

async function fetchProjectDetails(orgCode, projectId) {
  const token = window.adobeIMS?.getTokenFromStorage()?.token;

  if (!token) {
    console.error('No token available');
    return null;
  }

  try {
    const url = `/console/api/organizations/${orgCode}/projects/${projectId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    if (response.ok) {
      const projectData = await response.json();
      if (projectData.workspaces?.[0]) {
      }

      return projectData;
    } else {
      const errorText = await response.text();
      console.error('Failed:', errorText);
      return null;
    }
  } catch (error) {
    return null;
  }
}

function populateProjectsDropdown(returnContainer, projectsData) {

  const dropdown = returnContainer?.querySelector('.projects-picker');

  // Check if credential fields exist in the DOM
  if (!dropdown) {
    return false;
  }
  // Extract projects array (should include full data with workspaces/credentials)
  // Handle both cases: {projects: [...]} and direct array [...]
  let projects;
  if (Array.isArray(projectsData)) {
    projects = projectsData;
  } else if (projectsData?.projects) {
    projects = projectsData.projects;
  } else {
    projects = [];
  }

  // Log summary of all projects with their key data
  projects.forEach((proj, idx) => {
    const workspace = proj.workspaces?.[0];
    const credential = workspace?.credentials?.[0];
  });

  // Log first project structure for debugging
  if (projects.length > 0) {
    if (projects[0].workspaces?.[0]) {
      if (projects[0].workspaces[0].credentials?.[0]) {
      }
    }
  }

  // Clear existing options
  dropdown.innerHTML = '';

  // Populate dropdown with projects (use project ID as value)
  projects.forEach((project, index) => {
    const option = createTag('option', { value: project.id });
    option.textContent = project.title;
    dropdown.appendChild(option);
  });

  // Add onChange handler to dropdown
  dropdown.addEventListener('change', (e) => {
    const selectedProjectId = e.target.value;

    if (!selectedProjectId) {
      return;
    }

    // Find the selected project from the existing projects array (already has full data)
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    if (selectedProject) {
      updateProjectCardDetails(returnContainer, selectedProject);
    } else {
      console.error('Project not found in array:', selectedProjectId);
    }

  });

  // Set default selection to first project (by ID)
  if (projects[0]?.id) {
    dropdown.value = projects[0].id;

    // Update card with project data (search API already includes workspaces/credentials)
    updateProjectCardDetails(returnContainer, projects[0]);
  } else {
  }

  return true; // Return true to indicate projects exist
}

function updateProjectCardDetails(returnContainer, project) {

  if (!returnContainer || !project) {
    return;
  }

  // Extract data (similar to credential card)
  const projectName = project.title || project.name || 'Untitled Project';
  const projectId = project.id;
  const workspace = project.workspaces?.[0];
  const credential = workspace?.credentials?.[0];

  // Extract API Key - try nested structure first, then fallback to flat structure or other properties
  const apiKey = credential?.clientId
    || project.clientId  // Fallback: if clientId is directly on project
    || credential?.id_integration
    || credential?.apiKey
    || credential?.id
    || 'Not available';

  // Extract Allowed Origins - try nested structure first, then fallback to flat structure
  const allowedOrigins = credential?.metadata?.['adobeid.domain']
    || project.metadata?.['adobeid.domain']  // Fallback: if metadata is directly on project
    || credential?.metadata?.adobeid?.domain
    || credential?.metadata?.domain
    || 'Not set';

  const orgName = selectedOrganization?.name || 'Unknown';

  // Update project title

  const projectTitle = returnContainer.querySelector('.project-title');
  if (projectTitle) {
    projectTitle.textContent = projectName;
  }

  // Update project link
  const projectLink = returnContainer.querySelector('.project-link');
  if (projectLink && projectId) {
    const orgId = selectedOrganization?.id || project.org_id;
    const consoleUrl = `/console/projects/${orgId}/${projectId}/overview`;

    projectLink.href = consoleUrl;
    const projectLinkText = projectLink.querySelector('p');
    if (projectLinkText) {
      projectLinkText.textContent = projectName;
    }
  }

  // Update API Key
  const apiKeyElement = returnContainer.querySelector('.return-project-card [data-field="apiKey"]')
    || returnContainer.querySelector('[data-field="apiKey"]');
  if (apiKeyElement) {
    apiKeyElement.textContent = apiKey;
    const copyButton = apiKeyElement.closest('.credential-detail-field')?.querySelector('.copy-button');
    if (copyButton && apiKey !== 'Not available') {
      copyButton.setAttribute('data-copy', apiKey);
    }
  }

  // Update Allowed Origins
  const originsElement = returnContainer.querySelector('.return-project-card [data-field="allowedOrigins"]')
    || returnContainer.querySelector('[data-field="allowedOrigins"]');
  if (originsElement) {
    originsElement.textContent = allowedOrigins;
    const copyButton = originsElement.closest('.credential-detail-field')?.querySelector('.copy-button');
    if (copyButton && allowedOrigins !== 'Not set') {
      copyButton.setAttribute('data-copy', allowedOrigins);
    }
  }

  // Update Organization
  const orgElement = returnContainer.querySelector('.return-project-card [data-field="organization"]')
    || returnContainer.querySelector('[data-field="organization"]');
  if (orgElement) {
    orgElement.textContent = orgName;
  }

}

async function fetchOrganizations() {

  const token = window.adobeIMS?.getTokenFromStorage()?.token;

  if (!token) {
    return null;
  }

  try {
    // Fetch accounts with organizations (matching React component)
    const url = '/console/api/accounts?includeOrganizations=true';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.adobeIMS?.signIn();
      }
      throw new Error('Could not fetch accounts');
    }

    const accountsResult = await response.json();

    // Extract organizations from accounts
    const organizations = [];
    accountsResult.accounts?.forEach(account => {
      if (account.organizations?.length > 0) {
        account.organizations.forEach(org => {
          organizations.push({
            ...org,
            accountId: account.id,
            accountType: account.type
          });
        });
      }
    });

    // Sort organizations by name
    organizations.sort((a, b) => a.name.localeCompare(b.name));

    return organizations;
  } catch (error) {

    // Fallback: Try to get from IMS profile

    try {
      const profile = await window.adobeIMS?.getProfile();
      const accountId = profile?.userId;

      if (profile?.projectedProductContext) {
        const orgs = profile.projectedProductContext.map((ctx, index) => ({
          code: ctx.prodCtx.owningEntity,
          name: ctx.prodCtx.serviceCode || ctx.prodCtx.owningEntity,
          id: ctx.prodCtx.owningEntity,
          accountId: accountId,
          default: index === 0
        }));

        return orgs;
      }
    } catch (profileError) {
    }
  }

  return null;
}

async function getCredentialSecrets(response, orgCode) {

  const token = window.adobeIMS?.getTokenFromStorage()?.token;

  if (!token) {
    return null;
  }

  try {
    // Get project/credential ID from response
    const projectId = response?.workspaces
      ? response.workspaces[0]?.credentials[0]?.id
      : response?.id;

    const selectedOrgCode = orgCode || selectedOrganization?.code;

    if (!selectedOrgCode || !projectId) {
      return null;
    }

    const secretsUrl = `/console/api/organizations/${selectedOrgCode}/integrations/${projectId}/secrets`;

    const secretsResponse = await fetch(secretsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    if (secretsResponse.ok) {
      const secrets = await secretsResponse.json();

      const secret = secrets.client_secrets?.[0]?.client_secret;
      const result = {
        clientId: secrets?.client_id,
        clientSecret: secret
      };
      return result;
    }
  } catch (error) {
    // Error handled
  }

  return null;
}

async function generateToken(apiKey, secret, scopesDetails) {

  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: apiKey,
        client_secret: secret,
        grant_type: 'client_credentials',
        scope: scopesDetails?.scope || '',
      }),
    };

    const url = '/ims/token/v3';
    const tokenResponse = await fetch(url, options);

    if (tokenResponse.ok) {
      const tokenJson = await tokenResponse.json();
      return tokenJson.access_token;
    }
  } catch (error) {
    // Error handled
  }

  return null;
}

async function switchOrganization(org) {

  const profile = await window.adobeIMS?.getProfile();
  const accountId = profile?.userId;

  if (!org) {
    // This means it's initial load. Try reading from local storage
    const savedOrgString = localStorage.getItem(LOCAL_STORAGE_ORG_KEY);
    if (!savedOrgString) {
    }
    const orgInLocalStorage = savedOrgString ? JSON.parse(savedOrgString) : null;

    // Check if the user has access to the org
    if (orgInLocalStorage) {
      org = organizationsData?.filter(o =>
        o.code === orgInLocalStorage.code && accountId === orgInLocalStorage.accountId
      )[0];
    }

    // If no accessible org found in local storage, we pick the default org
    if (!org) {
      if (orgInLocalStorage) {
        localStorage.removeItem(LOCAL_STORAGE_ORG_KEY);
      } else {
      }

      if (organizationsData && organizationsData.length > 0) {
        const currentAccountOrgs = organizationsData.filter(o => o.accountId === accountId);

        org = currentAccountOrgs.filter(o => o.default)[0] ?? currentAccountOrgs[0];
      }
    }
  }

  if (!org) {
    throw new Error('No org found to switch to');
  }

  // Switch accounts if org requires account switch
  if (accountId !== org.accountId) {

    await window.adobeIMS?.switchProfile(org.accountId);
  } else {
  }

  // Set the org in local storage
  localStorage.setItem(LOCAL_STORAGE_ORG_KEY, JSON.stringify(org));
  selectedOrganization = org;
  return org;
}

function clearForm(formContainer) {
  // Clear form data object
  formData.CredentialName = '';
  formData.AllowedOrigins = '';
  formData.AdobeDeveloperConsole = false;
  formData.Downloads = false;
  // Don't clear Download object, it should persist

  // Clear form inputs
  const credentialNameInput = formContainer?.querySelector('[data-cy="add-credential-name"]');
  if (credentialNameInput) {
    credentialNameInput.value = '';
    credentialNameInput.classList.remove('error');
  }

  const allowedOriginsInput = formContainer?.querySelector('[data-cy="add-allowed-origins"]');
  if (allowedOriginsInput) {
    allowedOriginsInput.value = '';
    allowedOriginsInput.classList.remove('error');
  }

  // Uncheck checkboxes
  const agreementCheckbox = formContainer?.querySelector('.agreement-checkbox');
  if (agreementCheckbox) agreementCheckbox.checked = false;

  const downloadsCheckbox = formContainer?.querySelector('.downloads-checkbox');
  if (downloadsCheckbox) downloadsCheckbox.checked = false;

  // Reset validation state
  validationState.CredentialName = { valid: false, errors: [] };
  validationState.AllowedOrigins = { valid: true, errors: [] };

  // Clear error messages
  const errorDescriptions = formContainer?.querySelectorAll('.field-description.error');
  errorDescriptions?.forEach(desc => desc.classList.remove('error'));

  // Hide alert icons
  const alertIcons = formContainer?.querySelectorAll('.alert-icon');
  alertIcons?.forEach(icon => icon.style.display = 'none');

  // Reset character counter
  const counter = formContainer?.querySelector('[data-counter="CredentialName"]');
  if (counter) {
    const maxChars = counter.getAttribute('data-max');
    counter.textContent = maxChars;
  }

  // Update button state (should be disabled since form is empty)
  updateButtonState();

}

function updateCredentialCard(cardContainer, responseData) {

  if (!cardContainer || !responseData) return;

  // Extract data based on actual API response structure
  // API Response: { apiKey, projectId, id, orgId, workspaceId, subscriptionResult }

  const projectName = formData.CredentialName; // From form input
  const projectId = responseData.projectId || responseData.id;
  const apiKey = responseData.apiKey; // Direct from response
  const allowedOrigins = formData.AllowedOrigins; // From form textarea
  const orgName = selectedOrganization?.name; // From selected org

  // Update project title
  const projectTitle = cardContainer.querySelector('.project-title');
  if (projectTitle && projectName) {
    projectTitle.textContent = projectName;
  }

  // Update API Key value (try multiple selectors)
  let apiKeyValue = cardContainer.querySelector('[data-field="apiKey"]');
  if (!apiKeyValue) {
    apiKeyValue = cardContainer.querySelector('.credential-detail-field:nth-child(1) .credential-detail-value');
  }

  if (apiKeyValue && apiKey) {
    apiKeyValue.textContent = apiKey;

    // Update copy button data attribute
    const copyButton = apiKeyValue.closest('.credential-detail-field')?.querySelector('.copy-button')
      || apiKeyValue.parentElement?.querySelector('.copy-button');
    if (copyButton) {
      copyButton.setAttribute('data-copy', apiKey);
    }
  }

  // Update Allowed Origins value (try multiple selectors)
  let originsValue = cardContainer.querySelector('[data-field="allowedOrigins"]');
  if (!originsValue) {
    originsValue = cardContainer.querySelector('.credential-detail-field:nth-child(2) .credential-detail-value');
  }

  if (originsValue && allowedOrigins) {
    originsValue.textContent = allowedOrigins;
    // Update copy button data attribute
    const copyButton = originsValue.closest('.credential-detail-field')?.querySelector('.copy-button')
      || originsValue.parentElement?.querySelector('.copy-button');
    if (copyButton) {
      copyButton.setAttribute('data-copy', allowedOrigins);
    }
  }

  // Update Organization Name (try multiple selectors)
  let orgNameValue = cardContainer.querySelector('[data-field="organization"]');
  if (!orgNameValue) {
    orgNameValue = cardContainer.querySelector('.credential-detail-field:nth-child(3) .credential-detail-text');
  }

  if (orgNameValue && orgName) {
    orgNameValue.textContent = orgName;
  }

  // Update project link if available
  if (projectId && projectName) {
    const projectLink = cardContainer.querySelector('.project-link');

    // Build complete console URL with org ID and workspace ID
    const orgId = selectedOrganization?.id || responseData.orgId;
    const workspaceId = responseData.workspaceId;

    const consoleUrl = `/console/projects/${orgId}/${projectId}/overview`;

    if (projectLink) {
      projectLink.href = consoleUrl;

      // Update the text inside the <p> tag with project NAME (not ID)
      const projectLinkText = projectLink.querySelector('p');
      if (projectLinkText) {
        projectLinkText.textContent = projectName;  // Show project name from form
      } else {
        projectLink.textContent = projectName;  // Show project name from form
      }

    }
  }

}

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

  if (!input) {
    return;
  }

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
  if (!createButton) {
    return;
  }

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

  // Set default download based on number of options
  if (config.items && config.items.length > 0) {
    // Always set the first item as default
    const firstDownload = config.items[0].Download;
    formData.Download = firstDownload;
  } else {
    console.warn('[DOWNLOAD FIELD] No download items in config');
  }

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
function createReturnContent(config, handleReturnOrgChange) {
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
  getCredHeader.appendChild(createOrgNotice(
    `You're viewing in ${selectedOrganization?.type === "developer" ? 'your personal developer organization' : selectedOrganization?.name}  `,
    'org-notice-return',
    organizationsData,
    selectedOrganization,
    handleReturnOrgChange
  ));

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

  // Projects Dropdown (will be populated dynamically)
  if (config.components?.ProjectsDropdown) {
    const dropdownSection = createTag('div', { class: 'projects-dropdown-section' });
    const dropdownLabel = createTag('label', { class: 'spectrum-Body spectrum-Body--sizeS' });
    dropdownLabel.textContent = config.components.ProjectsDropdown.label;
    dropdownSection.appendChild(dropdownLabel);

    // Create empty dropdown - will be populated by populateProjectsDropdown()
    const dropdown = createTag('select', { class: 'spectrum-Picker projects-picker' });
    dropdownSection.appendChild(dropdown);

    if (config.components.ProjectsDropdown.subHeading) {
      const subHeading = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS dropdown-subheading' });
      subHeading.textContent = config.components.ProjectsDropdown.subHeading;
      dropdownSection.appendChild(subHeading);
    }

    rightContent.appendChild(dropdownSection);
  }

  // Project Card (will be populated dynamically)
  const projectCard = createTag('div', { class: 'return-project-card' });
  projectCard.appendChild(createProjectHeader('', config.components?.Products));

  // Divider
  projectCard.appendChild(createDivider());

  // Developer Console Project (will be updated dynamically)
  if (config.components?.DevConsoleLink) {
    const devConsoleSection = createTag('div', { class: 'dev-console-section' });
    const devConsoleLabel = createTag('h3', { class: 'section-label spectrum-Heading spectrum-Heading--sizeS' });
    devConsoleLabel.textContent = config.components.DevConsoleLink.heading;
    devConsoleSection.appendChild(devConsoleLabel);

    const projectLink = createExternalLink('', '#');
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
// LOADING PAGE
// ============================================================================

function createLoadingPage() {
  const loadingContainer = createTag('div', { class: 'loading-container hidden' });

  const loadingContent = createTag('div', { class: 'loading-content' });

  // Pure CSS/SVG Progress Circle
  const progressWrapper = createTag('div', { class: 'loading-progress' });
  progressWrapper.innerHTML = `
    <svg class="progress-circle-svg" viewBox="0 0 64 64" role="progressbar" aria-label="Loading">
      <circle class="progress-circle-track" cx="32" cy="32" r="28"></circle>
      <circle class="progress-circle-fill" cx="32" cy="32" r="28"></circle>
    </svg>
  `;
  loadingContent.appendChild(progressWrapper);

  // Loading text (will be updated dynamically)
  const loadingText = createTag('div', { class: 'loading-text' });
  loadingText.textContent = 'Loading...';
  loadingContent.appendChild(loadingText);

  // Additional message
  // const loadingMessage = createTag('div', { class: 'loading-message' });
  // loadingMessage.textContent = 'This process may take a few moments.';
  // loadingContent.appendChild(loadingMessage);

  loadingContainer.appendChild(loadingContent);

  // Store reference to text element for updates
  loadingContainer._textElement = loadingText;

  return loadingContainer;
}

// Helper function to update loading text
function setLoadingText(loadingContainer, text) {
  if (loadingContainer && loadingContainer._textElement) {
    loadingContainer._textElement.textContent = text;
  }
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
  // Initially hidden - will be shown only if download was checked
  downloadOptions.style.display = 'none';
  cardTitleWrapper.appendChild(downloadOptions);

  cardContainer.appendChild(cardTitleWrapper);

  const cardWrapper = createTag('div', { class: 'card-wrapper' });

  // Main card content
  const cardContent = createTag('div', { class: 'card-content' });

  // Project Card (will be populated dynamically via updateCredentialCard)
  const projectCard = createTag('div', { class: 'project-card' });
  projectCard.appendChild(createProjectHeader('', config.components?.Products));
  projectCard.appendChild(createDivider());

  // Developer Console Project section (will be updated dynamically)
  if (config.components?.DevConsoleLink) {
    const devConsoleSection = createTag('div', { class: 'dev-console-section' });
    const devConsoleLabel = createTag('h3', { class: 'section-label spectrum-Heading spectrum-Heading--sizeS' });
    devConsoleLabel.textContent = config.components.DevConsoleLink.heading;
    devConsoleSection.appendChild(devConsoleLabel);

    const projectLink = createExternalLink('', '#');
    projectLink.setAttribute('data-cy', 'credentialName-link');
    devConsoleSection.appendChild(projectLink);

    projectCard.appendChild(devConsoleSection);
  }

  cardContent.appendChild(projectCard);

  // Credential Details section
  if (config.components?.CredentialDetails) {
    const credSection = createCredentialSection(config.components.CredentialDetails);
    // Values will be populated dynamically after API call via updateCredentialCard()
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
  const manageLink = createExternalLink('Manage on Developer console', '/console/');
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

    // Extract template and organization data for API calls
    const getCredConfig = credentialJSON?.data?.[0]?.['GetCredential'];

    // Get template configuration from JSON - use templateId from config
    templateData = getCredConfig?.templateId || {
      id: getCredConfig?.templateId || 'default-template-id'
    };

    if (window.adobeIMS && window.adobeIMS.isSignedInUser()) {

      try {
        const orgs = await fetchOrganizations();
        if (orgs && orgs.length > 0) {
          organizationsData = orgs;
          // Initialize organization (from localStorage or default)
          await switchOrganization(null);
        } else {
          // Fallback to config-based organization
          selectedOrganization = {
            code: getCredConfig?.orgId || templateData.orgId,
            name: getCredConfig?.orgName || 'Personal Developer Organization'
          };
        }
      } catch (error) {
        // Fallback to config-based organization
        selectedOrganization = {
          code: getCredConfig?.orgId || templateData.orgId,
          name: getCredConfig?.orgName || 'Personal Developer Organization'
        };
      }
    } else {
      // Get organization data from config as fallback (when not signed in)
      selectedOrganization = {
        code: getCredConfig?.orgId || templateData.orgId,
        name: getCredConfig?.orgName || 'Personal Developer Organization'
      };
    }

  } catch (error) {
    block.innerHTML = '<p>Error loading credential data.</p>';
    return;
  }

  block.innerHTML = '';

  // Create sign-in container (always start as visible, will hide if user is signed in)
  let signInContainer;
  if (credentialData.SignIn) {
    signInContainer = createTag('div', { class: 'sign-in-container' });
    signInContainer.appendChild(createSignInContent(credentialData.SignIn));
    block.appendChild(signInContainer);
  }

  // Create loading page FIRST (used in multiple places below)
  const loadingContainer = createLoadingPage();
  block.appendChild(loadingContainer);

  // Define navigateTo function FIRST (used in multiple places below)
  const navigateTo = (hideEl, showEl, scroll = false) => {
    hideEl?.classList.add('hidden');
    showEl?.classList.remove('hidden');
    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Function to update cancel button visibility based on projects
  const updateCancelButtonVisibility = async (formContainer) => {
    const cancelButton = formContainer?.querySelector('.cancel-link');
    if (!cancelButton) return;

    try {
      const existingCreds = await fetchExistingCredentials(selectedOrganization?.code);
      const projectsArray = Array.isArray(existingCreds) ? existingCreds : existingCreds?.projects;

      if (!projectsArray || projectsArray.length === 0) {
        // No projects - hide cancel button
        cancelButton.style.display = 'none';
      } else {
        // Has projects - show cancel button
        cancelButton.style.display = '';
      }
    } catch (error) {
      // On error, hide cancel button
      cancelButton.style.display = 'none';
    }
  };

  // Helper function to get organization display name
  const getOrgDisplayName = () => {
    return selectedOrganization?.type === "developer"
      ? 'your personal developer organization'
      : selectedOrganization?.name;
  };

  // Helper function to get form organization text
  const getFormOrgText = () => {
    return `You're creating this credential in <b>${getOrgDisplayName()}</b>  `;
  };

  // Helper function to get return page organization text
  const getReturnOrgText = () => {
    return `You're viewing in <b>${getOrgDisplayName()}</b>  `;
  };

  // Function to update organization text in form
  const updateFormOrgNotice = (formContainer) => {
    const formOrgNotice = formContainer?.querySelector('.org-notice');
    if (formOrgNotice) {
      const formOrgText = formOrgNotice.querySelector('.org-text');
      if (formOrgText) {
        formOrgText.innerHTML = getFormOrgText();
      }
    }
  };

  // Function to update organization text in return page
  const updateReturnOrgNotice = (returnContainer) => {
    const orgNotice = returnContainer?.querySelector('.org-notice-return');
    if (orgNotice) {
      const orgText = orgNotice.querySelector('.org-text');
      if (orgText) {
        orgText.innerHTML = getReturnOrgText();
      }
    }
  };

  // Declare containers at top level for handler access
  let returnContainer;
  let formContainer;

  // Create return container (previously created projects)
  if (credentialData.Return) {

    // Define handleReturnOrgChange handler with access to all containers
    const handleReturnOrgChange = async (newOrg) => {
      try {
        // Use switchOrganization function
        await switchOrganization(newOrg);

        // Show loading page while fetching
        setLoadingText(loadingContainer, 'Loading...');
        navigateTo(returnContainer, loadingContainer);

        // Refresh credentials for new org
        fetchExistingCredentials(selectedOrganization?.code).then(async (existingCreds) => {

          if (existingCreds) {
            // Pass the data in consistent format (handle both array and object responses)
            const dataToPass = Array.isArray(existingCreds)
              ? { projects: existingCreds }
              : existingCreds;

            // Check if there are actually projects
            const projectsArray = Array.isArray(existingCreds) ? existingCreds : existingCreds?.projects;

            if (!projectsArray || projectsArray.length === 0) {
              // No projects found - immediately move to credential form
              navigateTo(loadingContainer, formContainer);
              updateFormOrgNotice(formContainer);
              await updateCancelButtonVisibility(formContainer);
              return;
            }

            // Populate dropdown with new org's projects (filter from cached data)
            const hasProjects = populateProjectsDropdown(returnContainer, dataToPass);

            if (!hasProjects) {
              // No projects found - immediately move to credential form
              navigateTo(loadingContainer, formContainer);

              updateFormOrgNotice(formContainer);
              await updateCancelButtonVisibility(formContainer);
            } else {
              // Has projects - show return page
              navigateTo(loadingContainer, returnContainer);
              updateReturnOrgNotice(returnContainer);
            }
          } else {
            // No credentials found - immediately move to credential form
            navigateTo(loadingContainer, formContainer);
            updateFormOrgNotice(formContainer);
            await updateCancelButtonVisibility(formContainer);
          }
        }).catch(error => {
          // On error, move to credential form
          navigateTo(loadingContainer, formContainer);
          updateFormOrgNotice(formContainer);
          updateCancelButtonVisibility(formContainer);
        });
      } catch (error) {
        // Silently handle error and stay on current page
        console.error('[ORG SWITCH ERROR]', error);
      }
    };

    // Always create return container as hidden initially
    returnContainer = createTag('div', { class: 'return-container hidden' });
    returnContainer.appendChild(createReturnContent(credentialData.Return, handleReturnOrgChange));
    block.appendChild(returnContainer);

    // Note: Navigation for already signed-in users is now handled by checkAlreadySignedIn()
    // which waits for IMS to be fully loaded before checking sign-in status
  }

  // Create form container
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
    const handleOrgChange = async (newOrg) => {
      try {
        // Use switchOrganization function
        await switchOrganization(newOrg);

        // Update org notice text
        updateFormOrgNotice(formContainer);

        // Check and update cancel button visibility
        await updateCancelButtonVisibility(formContainer);

        // Reset form data if needed (e.g., agreement checkbox)
        if (formData.Agree) {
          formData.Agree = false;
          const agreeCheckbox = formFields.querySelector('input[type="checkbox"]');
          if (agreeCheckbox) {
            agreeCheckbox.checked = false;
          }
        }
      } catch (error) {
        // Silently handle error
        console.error('[ORG SWITCH ERROR]', error);
      }
    };

    formHeader.appendChild(createOrgNotice(
      getFormOrgText(),
      'org-notice',
      organizationsData,
      selectedOrganization,
      handleOrgChange
    ));

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

    // Update organization text after form is created (in case orgs were loaded before form creation)
    if (selectedOrganization) {
      updateFormOrgNotice(formContainer);
    }
  }

  // Create success card container
  let cardContainer;
  if (credentialData.Card) {
    cardContainer = createTag('div', { class: 'credential-card-wrapper hidden' });
    cardContainer.appendChild(createCredentialCard(credentialData.Card));
    block.appendChild(cardContainer);
  }

  // Setup navigation handlers
  signInContainer?.querySelector('.sign-in-button')?.addEventListener('click', () => {
    if (window.adobeIMS.isSignedInUser()) {
      navigateTo(signInContainer, returnContainer);
    }
    else {
      window.adobeIMS.signIn();
    }
  });

  returnContainer?.querySelector('.create-new-button')?.addEventListener('click', async () => {

    // Ensure organizations are loaded
    if (!organizationsData || organizationsData.length === 0) {
      try {
        const orgs = await fetchOrganizations();
        if (orgs && orgs.length > 0) {
          organizationsData = orgs;
          await switchOrganization(null);
          // Update form organization text after switching
          updateFormOrgNotice(formContainer);
        }
      } catch (error) {
      }
    }

    // Ensure organization is selected
    if (!selectedOrganization) {
      try {
        await switchOrganization(null);
      } catch (error) {
        showToast('Unable to load organization. Please refresh the page.', 'error', 5000);
        return;
      }
    }

    // Clear the form before navigating
    clearForm(formContainer);
    navigateTo(returnContainer, formContainer, true);
    updateFormOrgNotice(formContainer);
    updateCancelButtonVisibility(formContainer);
  });

  formContainer?.querySelector('.create-button')?.addEventListener('click', async (e) => {
    e.preventDefault();

    // Validate all fields before submission
    const isCredentialNameValid = validationState.CredentialName.valid;
    const isAllowedOriginsValid = validationState.AllowedOrigins.valid;
    const isCredentialNameFilled = formData.CredentialName.trim() !== '';
    const isAgreementChecked = formData.AdobeDeveloperConsole;

    if (!isCredentialNameFilled || !isCredentialNameValid || !isAllowedOriginsValid || !isAgreementChecked) {
      return;
    }

    // Show loading page with "Creating credentials..." text

    setLoadingText(loadingContainer, 'Creating credentials...');
    navigateTo(formContainer, loadingContainer, true);

    try {
      // Call API to create credential

      const result = await createCredential();

      if (result?.success) {
        // Store response data
        credentialResponse = result.data;

        // Update card with dynamic values
        updateCredentialCard(cardContainer, credentialResponse);

        // API response received - Hide loading page and show success card
        navigateTo(loadingContainer, cardContainer, true);

        // Show/hide restart download section based on whether download was checked
        const restartDownloadWrapper = cardContainer?.querySelector('.restart-download-wrapper');
        if (restartDownloadWrapper) {
          const downloadsCheckbox = formContainer?.querySelector('.downloads-checkbox');
          if (downloadsCheckbox?.checked && formData.Downloads) {
            restartDownloadWrapper.style.display = 'flex';
          } else {
            restartDownloadWrapper.style.display = 'none';
          }
        }

        // Show success toast immediately when card opens
        setTimeout(() => {
          showToast('Your credential created successfully', 'success', 4000);
        }, 100);

        // Trigger download if downloads checkbox is checked
        const downloadsCheckbox = formContainer?.querySelector('.downloads-checkbox');

        if (downloadsCheckbox?.checked && formData.Downloads && credentialResponse) {
          console.log("credentialResponse--->", credentialResponse);
          const orgId = selectedOrganization?.id;
          const projectId = credentialResponse.projectId;
          const workspaceId = credentialResponse.workspaceId;
          const fileName = formData.CredentialName || 'credential';
          const zipFileURL = formData.Download?.href;

          console.log("orgId--->", orgId);
          console.log("projectId--->", projectId);
          console.log("workspaceId--->", workspaceId);

          if (orgId && zipFileURL) {
            const downloadAPI = `/console/api/organizations/${orgId}/projects/${projectId}/workspaces/${workspaceId}/download`;

            // Trigger download after card is fully visible
            setTimeout(async () => {
              try {
                await downloadZIP(downloadAPI, fileName, zipFileURL);
              } catch (error) {
                console.error('[DOWNLOAD ERROR]', error);
                showToast('Download failed. Please use the restart download link below.', 'error', 5000);
              }
            }, 1500);
          }
        }

      } else {
        // API response received (failed) - Hide loading and show form again
        navigateTo(loadingContainer, formContainer);
      }
    } catch (error) {
      // API error - Show error message
      // API error received - Hide loading and show form again
      navigateTo(loadingContainer, formContainer);
      showToast(`Error: ${error.message}`, 'error', 5000);
    }
  });

  formContainer?.querySelector('.cancel-link')?.addEventListener('click', async (e) => {
    e.preventDefault();

    // Show loading page
    setLoadingText(loadingContainer, 'Loading...');
    navigateTo(formContainer, loadingContainer, true);

    try {
      // Fetch organizations first
      await fetchOrganizations();

      // Then fetch existing credentials
      const existingCreds = await fetchExistingCredentials(selectedOrganization?.code);

      if (existingCreds) {
        // Pass the data in consistent format (handle both array and object responses)
        const dataToPass = Array.isArray(existingCreds)
          ? { projects: existingCreds }
          : existingCreds;

        // Populate dropdown with fresh data
        const hasProjects = populateProjectsDropdown(returnContainer, dataToPass);

        if (hasProjects) {
          navigateTo(loadingContainer, returnContainer);
          updateReturnOrgNotice(returnContainer);
        } else {
          // No projects found, stay on form
          navigateTo(loadingContainer, formContainer);
          updateFormOrgNotice(formContainer);
        }
      } else {
        // Error fetching, stay on form
        navigateTo(loadingContainer, formContainer);
        updateFormOrgNotice(formContainer);
      }
    } catch (error) {
      // On error, stay on form
      navigateTo(loadingContainer, formContainer);
      updateFormOrgNotice(formContainer);
    }
  });

  cardContainer?.querySelector('.restart-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Clear the form before navigating
    clearForm(formContainer);
    navigateTo(cardContainer, formContainer, true);
    updateFormOrgNotice(formContainer);
    updateCancelButtonVisibility(formContainer);
  });

  // Add event listener for restart download link
  cardContainer?.querySelector('.restart-download-link')?.addEventListener('click', async (e) => {
    e.preventDefault();

    if (credentialResponse) {
      const orgId = selectedOrganization?.id || credentialResponse.orgId;
      const projectId = credentialResponse.projectId;
      const workspaceId = credentialResponse.workspaceId;
      const fileName = formData.CredentialName || 'credential';
      const zipFileURL = formData.Download?.href;

      if (orgId && projectId && workspaceId && zipFileURL) {
        const downloadAPI = `/console/api/organizations/${orgId}/projects/${projectId}/workspaces/${workspaceId}/download`;
        try {
          await downloadZIP(downloadAPI, fileName, zipFileURL);
          showToast('Download started successfully', 'success', 2000);
        } catch (error) {
          console.error('[RESTART DOWNLOAD ERROR]', error);
          showToast('Failed to download credential files', 'error', 3000);
        }
      } else {
        console.warn('[RESTART DOWNLOAD SKIPPED] Missing required parameters:', {
          hasOrgId: !!orgId,
          hasProjectId: !!projectId,
          hasWorkspaceId: !!workspaceId,
          hasZipFileURL: !!zipFileURL
        });
      }
    } else {
      console.warn('[RESTART DOWNLOAD SKIPPED] No credential response available');
    }
  });

  // ============================================================================
  // IMS AUTHENTICATION HANDLERS
  // ============================================================================

  // Handle IMS callback after sign-in redirect
  const handleIMSCallback = () => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      window.history.replaceState(null, '', window.location.pathname);

      // Show loading page during sign-in process
      setLoadingText(loadingContainer, 'Loading...');
      navigateTo(signInContainer, loadingContainer, true);

      // Wait for IMS to process the token
      if (window.adobeIMS) {
        const checkSignIn = setInterval(() => {
          const isSignedIn = window.adobeIMS.isSignedInUser();
          if (isSignedIn) {
            clearInterval(checkSignIn);
            // Fetch organizations first
            fetchOrganizations().then(async orgs => {
              if (orgs && orgs.length > 0) {
                organizationsData = orgs;
                // Initialize organization (from localStorage or default)
                try {
                  await switchOrganization(null);
                } catch (error) {
                }
              }

              // Fetch existing credentials

              return fetchExistingCredentials(selectedOrganization?.code);
            }).then(async (existingCreds) => {

              if (existingCreds) {
                // Pass the data in consistent format (handle both array and object responses)
                const dataToPass = Array.isArray(existingCreds)
                  ? { projects: existingCreds }
                  : existingCreds;

                // Populate dropdown and update card (filter from cached data)
                const hasProjects = populateProjectsDropdown(returnContainer, dataToPass);

                if (!hasProjects) {
                  // No projects - navigate to form instead of return page
                  navigateTo(loadingContainer, formContainer);
                  updateCancelButtonVisibility(formContainer);
                  return;
                }
              }

              // API response received - hide loading and show return page

              navigateTo(loadingContainer, returnContainer);
            }).catch(error => {
              // On error, hide loading and still navigate to return page
              navigateTo(loadingContainer, returnContainer);
            });
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkSignIn);
        }, 5000);
      } else {
      }
    } else {
    }
  };

  // Check if user is already signed in when page loads
  const checkAlreadySignedIn = () => {
    // Don't check if we're handling an OAuth callback
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      return; // Let handleIMSCallback handle this
    }

    // Check if user is already signed in
    if (window.adobeIMS && window.adobeIMS.isSignedInUser()) {
      // User is already signed in - hide sign-in page and show appropriate content
      if (signInContainer && !signInContainer.classList.contains('hidden')) {
        // Navigate from sign-in to loading
        setLoadingText(loadingContainer, 'Loading...');
        navigateTo(signInContainer, loadingContainer, true);

        // Then fetch credentials and navigate to appropriate page
        // This is handled by the existing logic in the Return container creation (lines 1687-1730)
        // We just need to trigger it
        if (returnContainer) {
          fetchExistingCredentials(selectedOrganization?.code).then(async (existingCreds) => {
            const projectsArray = Array.isArray(existingCreds) ? existingCreds : existingCreds?.projects;

            if (projectsArray && projectsArray.length > 0) {
              const dataToPass = Array.isArray(existingCreds)
                ? { projects: existingCreds }
                : existingCreds;

              const hasProjects = populateProjectsDropdown(returnContainer, dataToPass);

              if (!hasProjects) {
                navigateTo(loadingContainer, formContainer);
                updateFormOrgNotice(formContainer);
                updateCancelButtonVisibility(formContainer);
              } else {
                navigateTo(loadingContainer, returnContainer);
                updateReturnOrgNotice(returnContainer);
              }
            } else {
              navigateTo(loadingContainer, formContainer);
              updateFormOrgNotice(formContainer);
              updateCancelButtonVisibility(formContainer);
            }
          }).catch(error => {
            navigateTo(loadingContainer, formContainer);
            updateFormOrgNotice(formContainer);
            updateCancelButtonVisibility(formContainer);
          });
        }
      }
    }
  };

  // Check for IMS callback on page load
  handleIMSCallback();

  // Check when IMS loads if user is already signed in
  window.addEventListener('adobeIMS:loaded', () => {
    handleIMSCallback();
    checkAlreadySignedIn();
  });

  // Also check immediately in case IMS is already loaded
  if (window.adobeIMS && window.adobeIMS.isSignedInUser()) {
    checkAlreadySignedIn();
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
