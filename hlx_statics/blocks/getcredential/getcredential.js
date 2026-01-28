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

// Store API response data
let credentialResponse = null;
let templateData = "664e39607dcc7c0e5a4a035b";
let selectedOrganization = null;
let organizationsData = null;
const token = window.adobeIMS?.getTokenFromStorage()?.token;

// Local storage key for organization
const LOCAL_STORAGE_ORG_KEY = 'adobe_selected_organization';

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function createCredential() {
  console.log('[CREATE CREDENTIAL] Starting credential creation...');
  console.log('[CREATE CREDENTIAL] Template Data:', templateData);
  console.log('[CREATE CREDENTIAL] Form Data:', formData);
  console.log('[CREATE CREDENTIAL] Selected Organization:', selectedOrganization);
  console.log('[CREATE CREDENTIAL] Token available:', !!token);

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

  console.log('[CREATE CREDENTIAL] APIs prepared:', apis);

  const data = {
    projectName: formData.CredentialName,
    description: 'created for get credential',
    metadata: {
      domain: formData.AllowedOrigins,
    },
    orgId: selectedOrganization?.code || templateData.orgId,
    apis,
  };

  console.log('[CREATE CREDENTIAL] Request payload:', data);

  const url = `/templates/install/${templateData.id}`;
  console.log('[CREATE CREDENTIAL] API URL:', url);

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

  console.log('[CREATE CREDENTIAL] Response status:', response.status);

  const resResp = await response?.json();
  console.log('[CREATE CREDENTIAL] Response body:', resResp);

  if (response.ok) {
    console.log('[CREATE CREDENTIAL] Success! Credential created:', resResp);
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
  console.log('[FETCH CREDENTIALS] Starting fetch...');
  console.log('[FETCH CREDENTIALS] Org Code:', orgCode);
  
  const token = window.adobeIMS?.getTokenFromStorage()?.token;
  console.log('[FETCH CREDENTIALS] Token available:', !!token);
  
  if (!token) {
    console.log('[FETCH CREDENTIALS] User not logged in, skipping fetch');
    return null;
  }

  // Use selected organization if available
  const selectedOrgCode = orgCode || selectedOrganization?.code;
  console.log('[FETCH CREDENTIALS] Using org code:', selectedOrgCode);
  
  try {
    // Fetch user's projects/credentials for the organization
    const url = selectedOrgCode 
      ? `/console/api/organizations/${selectedOrgCode}/projects`
      : '/console/api/projects';
    
    console.log('[FETCH CREDENTIALS] API URL:', url);
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    console.log('[FETCH CREDENTIALS] Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[FETCH CREDENTIALS] ===== RAW API RESPONSE =====');
      console.log('[FETCH CREDENTIALS] Response is Array?:', Array.isArray(data));
      console.log('[FETCH CREDENTIALS] Response has .projects?:', !!data?.projects);
      console.log('[FETCH CREDENTIALS] Response length:', data?.length);
      console.log('[FETCH CREDENTIALS] Full response:', data);
      console.log('[FETCH CREDENTIALS] ================================');
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
  console.log('[FETCH PROJECT] ========================================');
  console.log('[FETCH PROJECT] ===== FETCHING PROJECT DETAILS =====');
  console.log('[FETCH PROJECT] ========================================');
  console.log('[FETCH PROJECT] Org Code:', orgCode);
  console.log('[FETCH PROJECT] Org Code type:', typeof orgCode);
  console.log('[FETCH PROJECT] Project ID:', projectId);
  console.log('[FETCH PROJECT] Project ID type:', typeof projectId);
  
  const token = window.adobeIMS?.getTokenFromStorage()?.token;
  console.log('[FETCH PROJECT] Token available:', !!token);
  
  if (!token) {
    console.error('[FETCH PROJECT] ❌ No token available');
    return null;
  }
  
  try {
    const url = `/console/api/organizations/${orgCode}/projects/${projectId}`;
    console.log('[FETCH PROJECT] Full API URL:', url);
    console.log('[FETCH PROJECT] Making fetch request...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });
    
    console.log('[FETCH PROJECT] Response status:', response.status);
    console.log('[FETCH PROJECT] Response ok?:', response.ok);
    
    if (response.ok) {
      const projectData = await response.json();
      console.log('[FETCH PROJECT] ===== PROJECT DETAILS FETCHED =====');
      console.log('[FETCH PROJECT] Full response data:', projectData);
      console.log('[FETCH PROJECT] Has workspaces?:', !!projectData.workspaces);
      console.log('[FETCH PROJECT] Workspaces:', projectData.workspaces);
      if (projectData.workspaces?.[0]) {
        console.log('[FETCH PROJECT] First workspace:', projectData.workspaces[0]);
        console.log('[FETCH PROJECT] First workspace credentials:', projectData.workspaces[0].credentials);
      }
      console.log('[FETCH PROJECT] ===================================');
      return projectData;
    } else {
      const errorText = await response.text();
      console.error('[FETCH PROJECT] ❌ API Failed with status:', response.status);
      console.error('[FETCH PROJECT] Error response:', errorText);
      return null;
    }
  } catch (error) {
    console.error('[FETCH PROJECT] Error:', error);
    return null;
  }
}

function populateProjectsDropdown(returnContainer, projectsData) {
  console.log('[POPULATE DROPDOWN] ========================================');
  console.log('[POPULATE DROPDOWN] ===== FUNCTION CALLED =====');
  console.log('[POPULATE DROPDOWN] ========================================');
  console.log('[POPULATE DROPDOWN] returnContainer exists?:', !!returnContainer);
  console.log('[POPULATE DROPDOWN] returnContainer class:', returnContainer?.className);
  console.log('[POPULATE DROPDOWN] projectsData received:', projectsData);
  console.log('[POPULATE DROPDOWN] projectsData is Array?:', Array.isArray(projectsData));
  console.log('[POPULATE DROPDOWN] projectsData.projects exists?:', !!projectsData?.projects);
  console.log('[POPULATE DROPDOWN] ===== GLOBAL STATE CHECK =====');
  console.log('[POPULATE DROPDOWN] selectedOrganization:', selectedOrganization);
  console.log('[POPULATE DROPDOWN] selectedOrganization.code:', selectedOrganization?.code);
  console.log('[POPULATE DROPDOWN] selectedOrganization.id:', selectedOrganization?.id);
  
  const dropdown = returnContainer?.querySelector('.projects-picker');
  console.log('[POPULATE DROPDOWN] Dropdown element found?:', !!dropdown);
  
  // Check if credential fields exist in the DOM
  const apiKeyField = returnContainer?.querySelector('[data-field="apiKey"]');
  const originsField = returnContainer?.querySelector('[data-field="allowedOrigins"]');
  const orgField = returnContainer?.querySelector('[data-field="organization"]');
  
  console.log('[POPULATE DROPDOWN] ===== DOM ELEMENTS CHECK =====');
  console.log('[POPULATE DROPDOWN] [data-field="apiKey"] exists?:', !!apiKeyField);
  console.log('[POPULATE DROPDOWN] [data-field="allowedOrigins"] exists?:', !!originsField);
  console.log('[POPULATE DROPDOWN] [data-field="organization"] exists?:', !!orgField);
  
  if (!dropdown) {
    console.error('[POPULATE DROPDOWN] ❌ DROPDOWN NOT FOUND! Returning false.');
    return false;
  }
  
  // Extract projects array (should include full data with workspaces/credentials)
  // Handle both cases: {projects: [...]} and direct array [...]
  let projects;
  if (Array.isArray(projectsData)) {
    console.log('[POPULATE DROPDOWN] projectsData IS the array directly');
    projects = projectsData;
  } else if (projectsData?.projects) {
    console.log('[POPULATE DROPDOWN] projectsData has .projects property');
    projects = projectsData.projects;
  } else {
    console.log('[POPULATE DROPDOWN] projectsData has unexpected structure');
    projects = [];
  }
  
  console.log('[POPULATE DROPDOWN] Final projects array:', projects);
  console.log('[POPULATE DROPDOWN] Projects is Array?:', Array.isArray(projects));
  console.log('[POPULATE DROPDOWN] Projects length:', projects.length);
  
  // Clear existing options
  dropdown.innerHTML = '';
  
  console.log('[POPULATE DROPDOWN] ✅ Found', projects.length, 'projects! Proceeding...');
  
  // Reverse projects array to show newest first
  projects = [...projects].reverse();
  console.log('[POPULATE DROPDOWN] Reversed projects (newest first)');
  console.log('[POPULATE DROPDOWN] Dropdown enabled for', projects.length, 'project(s)');

  console.log("projects--myconsole",projects)
  
  // Populate dropdown with projects (use project ID as value)
  projects.forEach((project, index) => {
    const option = createTag('option', { value: project.id });
    option.textContent = project.title;
    dropdown.appendChild(option);
    console.log('[POPULATE DROPDOWN] Added option:', option.textContent, 'with value (ID):', project.id);
  });
  
  console.log('[POPULATE DROPDOWN] Added', projects.length, 'projects to dropdown');
  
  // Add onChange handler to dropdown
  dropdown.addEventListener('change', (e) => {
    const selectedProjectId = e.target.value;
    console.log('[DROPDOWN CHANGE] ========================================');
    console.log('[DROPDOWN CHANGE] Selected project ID:', selectedProjectId);
    console.log('[DROPDOWN CHANGE] Selected project name:', e.target.options[e.target.selectedIndex]?.text);
    
    if (!selectedProjectId) {
      console.error('[DROPDOWN CHANGE] ❌ No project ID selected');
      return;
    }
    
    const orgCode = selectedOrganization?.code;
    if (!orgCode) {
      console.error('[DROPDOWN CHANGE] ❌ No organization code available');
      return;
    }
    
    // Fetch full project details and update card
    console.log('[DROPDOWN CHANGE] Fetching project details...');
    fetchProjectDetails(orgCode, selectedProjectId)
      .then(fullProjectData => {
        if (fullProjectData) {
          console.log('[DROPDOWN CHANGE] ✅ Data received, updating card...');
          updateProjectCardDetails(returnContainer, fullProjectData);
          console.log('[DROPDOWN CHANGE] ✅ Card updated successfully');
        } else {
          console.error('[DROPDOWN CHANGE] ❌ No data received from API');
        }
      })
      .catch(error => {
        console.error('[DROPDOWN CHANGE] ❌ Error:', error.message);
      });
    
    console.log('[DROPDOWN CHANGE] ========================================');
  });
  
  // Set default selection to first project (by ID)
  if (projects[0]?.id) {
    dropdown.value = projects[0].id;
    console.log('[POPULATE DROPDOWN] ========================================');
    console.log('[POPULATE DROPDOWN] ===== FETCHING FULL DETAILS FOR FIRST PROJECT =====');
    console.log('[POPULATE DROPDOWN] ========================================');
    console.log('[POPULATE DROPDOWN] First project ID:', projects[0].id);
    console.log('[POPULATE DROPDOWN] First project title:', projects[0].title);
    console.log('[POPULATE DROPDOWN] Selected organization code:', selectedOrganization?.code);
    console.log('[POPULATE DROPDOWN] Need to fetch full project details with workspaces/credentials...');
    
    // Fetch full project details (includes workspaces and credentials)
    const orgCode = selectedOrganization?.code;
    
    if (!orgCode) {
      console.error('[POPULATE DROPDOWN] ❌ No organization code available!');
      console.error('[POPULATE DROPDOWN] selectedOrganization:', selectedOrganization);
      console.error('[POPULATE DROPDOWN] Cannot fetch project details without org code!');
      // Update card with basic data only (no API key/origins)
      updateProjectCardDetails(returnContainer, projects[0]);
      return true; // Still return true since dropdown is populated
    }
    
    console.log('[POPULATE DROPDOWN] Calling fetchProjectDetails with:');
    console.log('[POPULATE DROPDOWN]   - Org Code:', orgCode);
    console.log('[POPULATE DROPDOWN]   - Project ID:', projects[0].id);
    
    fetchProjectDetails(orgCode, projects[0].id).then(fullProjectData => {
      console.log('[POPULATE DROPDOWN] ========================================');
      console.log('[POPULATE DROPDOWN] ===== FETCH PROJECT DETAILS RESPONSE =====');
      console.log('[POPULATE DROPDOWN] ========================================');
      console.log('[POPULATE DROPDOWN] Full response:', fullProjectData);
      console.log('[POPULATE DROPDOWN] Is null/undefined?:', !fullProjectData);
      
      if (fullProjectData) {
        console.log('[POPULATE DROPDOWN] Response keys:', Object.keys(fullProjectData));
        console.log('[POPULATE DROPDOWN] Has workspaces:', !!fullProjectData.workspaces);
        console.log('[POPULATE DROPDOWN] Workspaces:', fullProjectData.workspaces);
        
        if (fullProjectData.workspaces?.[0]) {
          console.log('[POPULATE DROPDOWN] First workspace:', fullProjectData.workspaces[0]);
          console.log('[POPULATE DROPDOWN] Has credentials:', !!fullProjectData.workspaces[0].credentials);
          console.log('[POPULATE DROPDOWN] Credentials:', fullProjectData.workspaces[0].credentials);
        }
        
        // Update card with FULL project data
        console.log('[POPULATE DROPDOWN] ===== CALLING updateProjectCardDetails =====');
        updateProjectCardDetails(returnContainer, fullProjectData);
        
        console.log('[POPULATE DROPDOWN] ===== VERIFYING CARD WAS UPDATED =====');
        const verifyTitle = returnContainer.querySelector('.project-title');
        const verifyApiKey = returnContainer.querySelector('[data-field="apiKey"]');
        const verifyOrigins = returnContainer.querySelector('[data-field="allowedOrigins"]');
        
        console.log('[POPULATE DROPDOWN] After update, card shows:');
        console.log('[POPULATE DROPDOWN]   ► Title in DOM:', verifyTitle?.textContent || '❌ EMPTY');
        console.log('[POPULATE DROPDOWN]   ► API Key in DOM:', verifyApiKey?.textContent || '❌ EMPTY');
        console.log('[POPULATE DROPDOWN]   ► Origins in DOM:', verifyOrigins?.textContent || '❌ EMPTY');
        
        if (!verifyTitle?.textContent || !verifyApiKey?.textContent) {
          console.error('[POPULATE DROPDOWN] ❌ CARD IS STILL EMPTY AFTER UPDATE!');
          console.error('[POPULATE DROPDOWN] This means either:');
          console.error('[POPULATE DROPDOWN]   1. API returned no credential data');
          console.error('[POPULATE DROPDOWN]   2. Data structure is unexpected');
          console.error('[POPULATE DROPDOWN]   3. DOM selectors not finding elements');
        } else {
          console.log('[POPULATE DROPDOWN] ✅ Card populated successfully!');
        }
      } else {
        console.error('[POPULATE DROPDOWN] ❌ fetchProjectDetails returned null/undefined!');
        console.error('[POPULATE DROPDOWN] Updating card with basic project data only...');
        updateProjectCardDetails(returnContainer, projects[0]);
      }
    }).catch(error => {
      console.error('[POPULATE DROPDOWN] ❌ ERROR in fetchProjectDetails:');
      console.error('[POPULATE DROPDOWN] Error:', error);
      console.error('[POPULATE DROPDOWN] Error stack:', error.stack);
      // Update card with basic data
      updateProjectCardDetails(returnContainer, projects[0]);
    });
  } else {
    console.error('[POPULATE DROPDOWN] ❌ No valid first project found!');
  }
  
  console.log('[POPULATE DROPDOWN] onChange event listener attached to dropdown');
  
  return true; // Return true to indicate projects exist
}

function updateProjectCardDetails(returnContainer, project) {
  console.log('[UPDATE PROJECT CARD] ========================================');
  console.log('[UPDATE PROJECT CARD] ===== START =====');
  console.log('[UPDATE PROJECT CARD] ========================================');
  console.log('[UPDATE PROJECT CARD] Full project data:', project);
  
  if (!returnContainer || !project) {
    console.error('[UPDATE PROJECT CARD] ❌ Missing returnContainer or project!');
    return;
  }
  
  // Extract data (similar to credential card)
  const projectName = project.title || project.name || 'Untitled Project';
  const projectId = project.id;
  const workspace = project.workspaces?.[0];
  const credential = workspace?.credentials?.[0];
  
  const apiKey = credential?.id_integration || credential?.apiKey || credential?.id || 'Not available';
  const allowedOrigins = credential?.metadata?.['adobeid.domain'] || credential?.metadata?.domain || 'Not set';
  const orgName = selectedOrganization?.name || 'Unknown';
  
  console.log('[UPDATE PROJECT CARD] ===== EXTRACTED VALUES =====');
  console.log('[UPDATE PROJECT CARD] Project Name:', projectName);
  console.log('[UPDATE PROJECT CARD] API Key:', apiKey !== 'Not available' ? apiKey.substring(0, 15) + '...' : apiKey);
  console.log('[UPDATE PROJECT CARD] Allowed Origins:', allowedOrigins);
  console.log('[UPDATE PROJECT CARD] Organization:', orgName);
  console.log('[UPDATE PROJECT CARD] Has workspace:', !!workspace);
  console.log('[UPDATE PROJECT CARD] Has credential:', !!credential);
  
  // Update project title
  console.log('[UPDATE PROJECT CARD] ===== UPDATING DOM =====');
  const projectTitle = returnContainer.querySelector('.project-title');
  if (projectTitle) {
    projectTitle.textContent = projectName;
    console.log('[UPDATE PROJECT CARD] ✅ Title updated:', projectName);
  }
  
  // Update project link
  const projectLink = returnContainer.querySelector('.project-link');
  if (projectLink && projectId) {
    const orgId = selectedOrganization?.id || project.org_id;
    const workspaceId = workspace?.id || '';
    const consoleUrl = workspaceId 
      ? `/console/projects/${orgId}/${projectId}/${workspaceId}/overview`
      : `/console/projects/${orgId}/${projectId}/overview`;
    
    projectLink.href = consoleUrl;
    const projectLinkText = projectLink.querySelector('p');
    if (projectLinkText) {
      projectLinkText.textContent = projectName;
    }
    console.log('[UPDATE PROJECT CARD] ✅ Link updated:', projectName);
  }
  
  // Update API Key
  const apiKeyElement = returnContainer.querySelector('.return-project-card [data-field="apiKey"]');
  if (apiKeyElement) {
    apiKeyElement.textContent = apiKey;
    const copyButton = apiKeyElement.closest('.credential-detail-field')?.querySelector('.copy-button');
    if (copyButton && apiKey !== 'Not available') {
      copyButton.setAttribute('data-copy', apiKey);
    }
    console.log('[UPDATE PROJECT CARD] ✅ API Key updated:', apiKey !== 'Not available' ? apiKey.substring(0, 15) + '...' : apiKey);
  }
  
  // Update Allowed Origins
  const originsElement = returnContainer.querySelector('[data-field="allowedOrigins"]');
  if (originsElement) {
    originsElement.textContent = allowedOrigins;
    const copyButton = originsElement.closest('.credential-detail-field')?.querySelector('.copy-button');
    if (copyButton && allowedOrigins !== 'Not set') {
      copyButton.setAttribute('data-copy', allowedOrigins);
    }
    console.log('[UPDATE PROJECT CARD] ✅ Allowed Origins updated:', allowedOrigins);
  }
  
  // Update Organization
  const orgElement = returnContainer.querySelector('[data-field="organization"]');
  if (orgElement) {
    orgElement.textContent = orgName;
    console.log('[UPDATE PROJECT CARD] ✅ Organization updated:', orgName);
  }
  
  console.log('[UPDATE PROJECT CARD] ========================================');
  console.log('[UPDATE PROJECT CARD] ===== ✅ UPDATE COMPLETE =====');
  console.log('[UPDATE PROJECT CARD] ========================================');
}

async function fetchOrganizations() {
  console.log('[FETCH ORGANIZATIONS] Starting fetch...');
  
  const token = window.adobeIMS?.getTokenFromStorage()?.token;
  console.log('[FETCH ORGANIZATIONS] Token available:', !!token);
  
  if (!token) {
    console.error('[FETCH ORGANIZATIONS] User not logged in');
    return null;
  }

  try {
    // Fetch accounts with organizations (matching React component)
    const url = '/console/api/accounts?includeOrganizations=true';
    console.log('[FETCH ORGANIZATIONS] API URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    console.log('[FETCH ORGANIZATIONS] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('[FETCH ORGANIZATIONS] Unauthorized, triggering sign-in');
        window.adobeIMS?.signIn();
      }
      throw new Error('Could not fetch accounts');
    }

    const accountsResult = await response.json();
    console.log('[FETCH ORGANIZATIONS] Accounts fetched:', accountsResult);

    // Extract organizations from accounts
    const organizations = [];
    accountsResult.accounts?.forEach(account => {
      console.log('[FETCH ORGANIZATIONS] Processing account:', account.id, account.type);
      if (account.organizations?.length > 0) {
        console.log('[FETCH ORGANIZATIONS] Found', account.organizations.length, 'organizations in account');
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
    
    console.log('[FETCH ORGANIZATIONS] Total organizations processed:', organizations.length, organizations);
    return organizations;
  } catch (error) {
    console.error('[FETCH ORGANIZATIONS] Error fetching organizations:', error);
    
    // Fallback: Try to get from IMS profile
    console.log('[FETCH ORGANIZATIONS] Attempting IMS profile fallback...');
    try {
      const profile = await window.adobeIMS?.getProfile();
      const accountId = profile?.userId;
      console.log('[FETCH ORGANIZATIONS] IMS Profile:', profile);
      console.log('[FETCH ORGANIZATIONS] Account ID:', accountId);
      
      if (profile?.projectedProductContext) {
        const orgs = profile.projectedProductContext.map((ctx, index) => ({
          code: ctx.prodCtx.owningEntity,
          name: ctx.prodCtx.serviceCode || ctx.prodCtx.owningEntity,
          id: ctx.prodCtx.owningEntity,
          accountId: accountId,
          default: index === 0
        }));
        console.log('[FETCH ORGANIZATIONS] Organizations from IMS profile fallback:', orgs);
        return orgs;
      }
    } catch (profileError) {
      console.error('[FETCH ORGANIZATIONS] Error fetching from IMS profile:', profileError);
    }
  }
  
  console.log('[FETCH ORGANIZATIONS] No organizations found');
  return null;
}

async function getCredentialSecrets(response, orgCode) {
  console.log('[GET SECRETS] Starting fetch...');
  console.log('[GET SECRETS] Response:', response);
  console.log('[GET SECRETS] Org Code:', orgCode);
  
  const token = window.adobeIMS?.getTokenFromStorage()?.token;
  console.log('[GET SECRETS] Token available:', !!token);
  
  if (!token) {
    console.error('[GET SECRETS] User not logged in');
    return null;
  }

  try {
    // Get project/credential ID from response
    const projectId = response?.workspaces 
      ? response.workspaces[0]?.credentials[0]?.id 
      : response?.id;
    
    const selectedOrgCode = orgCode || selectedOrganization?.code;
    
    console.log('[GET SECRETS] Project ID:', projectId);
    console.log('[GET SECRETS] Org Code:', selectedOrgCode);
    
    if (!selectedOrgCode || !projectId) {
      console.error('[GET SECRETS] Missing organization code or project ID');
      return null;
    }

    const secretsUrl = `/console/api/organizations/${selectedOrgCode}/integrations/${projectId}/secrets`;
    console.log('[GET SECRETS] API URL:', secretsUrl);
    
    const secretsResponse = await fetch(secretsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-api-key': window?.adobeIMS?.adobeIdData?.client_id,
      },
    });

    console.log('[GET SECRETS] Response status:', secretsResponse.status);

    if (secretsResponse.ok) {
      const secrets = await secretsResponse.json();
      console.log('[GET SECRETS] Secrets response:', secrets);
      
      const secret = secrets.client_secrets?.[0]?.client_secret;
      const result = { 
        clientId: secrets?.client_id, 
        clientSecret: secret 
      };
      
      console.log('[GET SECRETS] Secrets retrieved:', { 
        clientId: result.clientId, 
        clientSecret: secret ? '***' + secret.slice(-4) : 'N/A' 
      });
      return result;
    } else {
      console.error('[GET SECRETS] Failed with status:', secretsResponse.status);
    }
  } catch (error) {
    console.error('[GET SECRETS] Error:', error);
  }
  
  return null;
}

async function generateToken(apiKey, secret, scopesDetails) {
  console.log('[GENERATE TOKEN] Starting token generation...');
  console.log('[GENERATE TOKEN] API Key:', apiKey);
  console.log('[GENERATE TOKEN] Secret available:', !!secret);
  console.log('[GENERATE TOKEN] Scopes:', scopesDetails);
  
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
    console.log('[GENERATE TOKEN] API URL:', url);
    console.log('[GENERATE TOKEN] Request body params:', {
      client_id: apiKey,
      grant_type: 'client_credentials',
      scope: scopesDetails?.scope || '',
      client_secret: '***'
    });

    const tokenResponse = await fetch(url, options);
    console.log('[GENERATE TOKEN] Response status:', tokenResponse.status);
    
    if (tokenResponse.ok) {
      const tokenJson = await tokenResponse.json();
      console.log('[GENERATE TOKEN] Token generated successfully');
      console.log('[GENERATE TOKEN] Token preview:', tokenJson.access_token?.substring(0, 20) + '...');
      return tokenJson.access_token;
    } else {
      const errorText = await tokenResponse.text();
      console.error('[GENERATE TOKEN] Failed:', errorText);
    }
  } catch (error) {
    console.error('[GENERATE TOKEN] Error:', error);
  }
  
  console.log('[GENERATE TOKEN] No token generated');
  return null;
}

async function switchOrganization(org) {
  console.log('[SWITCH ORG] Starting organization switch...');
  console.log('[SWITCH ORG] Input org:', org);
  console.log('[SWITCH ORG] Organizations data available:', organizationsData?.length || 0, 'orgs');
  
  const profile = await window.adobeIMS?.getProfile();
  const accountId = profile?.userId;
  console.log('[SWITCH ORG] Current account ID:', accountId);

  if (!org) {
    // This means it's initial load. Try reading from local storage
    console.log('[SWITCH ORG] No org provided, checking localStorage...');
    const savedOrgString = localStorage.getItem(LOCAL_STORAGE_ORG_KEY);
    
    if (!savedOrgString) {
      console.log('[SWITCH ORG] localStorage is empty (first time user or cleared)');
    }
    
    const orgInLocalStorage = savedOrgString ? JSON.parse(savedOrgString) : null;
    console.log('[SWITCH ORG] Found in localStorage:', orgInLocalStorage ? orgInLocalStorage.name : 'Nothing', orgInLocalStorage);

    // Check if the user has access to the org
    if (orgInLocalStorage) {
      org = organizationsData?.filter(o => 
        o.code === orgInLocalStorage.code && accountId === orgInLocalStorage.accountId
      )[0];
      console.log(`[SWITCH ORG] Org in localStorage ${org ? 'accessible' : 'not accessible'}`);
    }

    // If no accessible org found in local storage, we pick the default org
    if (!org) {
      if (orgInLocalStorage) {
        console.log('[SWITCH ORG] No accessible org in localStorage. Picking default...');
        localStorage.removeItem(LOCAL_STORAGE_ORG_KEY);
        console.log('[SWITCH ORG] Removed invalid localStorage entry');
      } else {
        console.log('[SWITCH ORG] First time initialization - picking default org...');
      }
      
      if (organizationsData && organizationsData.length > 0) {
        const currentAccountOrgs = organizationsData.filter(o => o.accountId === accountId);
        console.log('[SWITCH ORG] Current account orgs:', currentAccountOrgs.length);
        org = currentAccountOrgs.filter(o => o.default)[0] ?? currentAccountOrgs[0];
        console.log('[SWITCH ORG] Selected default org (first in list):', org);
      }
    }
  }

  console.log('[SWITCH ORG] Target org:', org?.name, org);
  
  if (!org) {
    console.error('[SWITCH ORG] No org found to switch to');
    throw new Error('No org found to switch to');
  }

  // Switch accounts if org requires account switch
  if (accountId !== org.accountId) {
    console.log('[SWITCH ORG] Account switch required');
    console.log('[SWITCH ORG] Switching account from', accountId, 'to', org.accountId);
    await window.adobeIMS?.switchProfile(org.accountId);
    console.log('[SWITCH ORG] Account switch completed');
  } else {
    console.log('[SWITCH ORG] No account switch needed');
  }

  // Set the org in local storage
  localStorage.setItem(LOCAL_STORAGE_ORG_KEY, JSON.stringify(org));
  console.log('[SWITCH ORG] Saved to localStorage');
  
  selectedOrganization = org;
  console.log('[SWITCH ORG] Organization switched successfully to:', org.name);
  console.log('[SWITCH ORG] Selected organization:', selectedOrganization);
  
  return org;
}

function clearForm(formContainer) {
  console.log('[CLEAR FORM] Clearing all form fields...');
  
  // Clear form data object
  formData.CredentialName = '';
  formData.AllowedOrigins = '';
  formData.AdobeDeveloperConsole = false;
  formData.Downloads = false;
  formData.Download = '';
  
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
  
  console.log('[CLEAR FORM] Form cleared successfully');
}

function updateCredentialCard(cardContainer, responseData) {
  console.log('[UPDATE CARD] Success card - Response data:', responseData);
  console.log('[UPDATE CARD] Success card - Form data:', formData);
  
  if (!cardContainer || !responseData) return;

  // Extract data based on actual API response structure
  // API Response: { apiKey, projectId, id, orgId, workspaceId, subscriptionResult }
  
  const projectName = formData.CredentialName; // From form input
  const projectId = responseData.projectId || responseData.id;
  const apiKey = responseData.apiKey; // Direct from response
  const allowedOrigins = formData.AllowedOrigins; // From form textarea
  const orgName = selectedOrganization?.name; // From selected org
  
  console.log('[UPDATE CARD] Success card - Extracted values:', {
    projectName,
    projectId,
    apiKey: apiKey ,
    allowedOrigins,
    orgName
  });

  // Update project title
  const projectTitle = cardContainer.querySelector('.project-title');
  if (projectTitle && projectName) {
    projectTitle.textContent = projectName;
    console.log('[UPDATE CARD] Success card - Updated title to:', projectName);
  }

  // Update API Key value (try multiple selectors)
  let apiKeyValue = cardContainer.querySelector('[data-field="apiKey"]');
  if (!apiKeyValue) {
    apiKeyValue = cardContainer.querySelector('.credential-detail-field:nth-child(1) .credential-detail-value');
  }
  
  if (apiKeyValue && apiKey) {
    apiKeyValue.textContent = apiKey;
    console.log('[UPDATE CARD] Success card - Updated API Key:', apiKey.substring(0, 10) + '...');
    
    // Update copy button data attribute
    const copyButton = apiKeyValue.closest('.credential-detail-field')?.querySelector('.copy-button')
      || apiKeyValue.parentElement?.querySelector('.copy-button');
    if (copyButton) {
      copyButton.setAttribute('data-copy', apiKey);
      console.log('[UPDATE CARD] Success card - Updated copy button for API Key');
    }
  }

  // Update Allowed Origins value (try multiple selectors)
  let originsValue = cardContainer.querySelector('[data-field="allowedOrigins"]');
  if (!originsValue) {
    originsValue = cardContainer.querySelector('.credential-detail-field:nth-child(2) .credential-detail-value');
  }
  
  if (originsValue && allowedOrigins) {
    originsValue.textContent = allowedOrigins;
    console.log('[UPDATE CARD] Success card - Updated Allowed Origins:', allowedOrigins);
    
    // Update copy button data attribute
    const copyButton = originsValue.closest('.credential-detail-field')?.querySelector('.copy-button')
      || originsValue.parentElement?.querySelector('.copy-button');
    if (copyButton) {
      copyButton.setAttribute('data-copy', allowedOrigins);
      console.log('[UPDATE CARD] Success card - Updated copy button for Allowed Origins');
    }
  }

  // Update Organization Name (try multiple selectors)
  let orgNameValue = cardContainer.querySelector('[data-field="organization"]');
  if (!orgNameValue) {
    orgNameValue = cardContainer.querySelector('.credential-detail-field:nth-child(3) .credential-detail-text');
  }
  
  if (orgNameValue && orgName) {
    orgNameValue.textContent = orgName;
    console.log('[UPDATE CARD] Success card - Updated Organization:', orgName);
  }

  // Update project link if available
  if (projectId && projectName) {
    const projectLink = cardContainer.querySelector('.project-link');
    
    // Build complete console URL with org ID and workspace ID
    const orgId = selectedOrganization?.id || responseData.orgId;
    const workspaceId = responseData.workspaceId;
    
    const consoleUrl = workspaceId 
      ? `/console/projects/${orgId}/${projectId}/${workspaceId}/overview`
      : `/console/projects/${orgId}/${projectId}/overview`;
    
    if (projectLink) {
      projectLink.href = consoleUrl;
      
      // Update the text inside the <p> tag with project NAME (not ID)
      const projectLinkText = projectLink.querySelector('p');
      if (projectLinkText) {
        projectLinkText.textContent = projectName;  // Show project name from form
      } else {
        projectLink.textContent = projectName;  // Show project name from form
      }
      
      console.log('[UPDATE CARD] Success card - Updated project link with name:', projectName);
      console.log('[UPDATE CARD] Success card - Complete URL:', consoleUrl);
      console.log('[UPDATE CARD] Success card - Org ID:', orgId, 'Project ID:', projectId, 'Workspace ID:', workspaceId);
    }
  }
  
  console.log('[UPDATE CARD] Success card update complete');
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
  console.log('[VALIDATION] Updating field validation...');
  console.log('[VALIDATION] Field:', fieldName);
  console.log('[VALIDATION] Validation:', validation);
  
  const input = document.querySelector(fieldName === 'CredentialName' ? 
    '[data-cy="add-credential-name"]' : 
    '[data-cy="add-allowed-origins"]');
  
  if (!input) {
    console.log('[VALIDATION] Input not found for field:', fieldName);
    return;
  }

  const fieldContainer = input.closest('.form-field');
  const descriptionElement = fieldContainer?.querySelector('.field-description');
  const alertIcon = fieldContainer?.querySelector('.alert-icon');

  if (validation.error || validation.errors?.length) {
    console.log('[VALIDATION] Field has errors');
    // Show error - just change color by adding error class
    input.classList.add('error');
    if (descriptionElement) {
      descriptionElement.classList.add('error');
      console.log('[VALIDATION] Added error class to description');
    }
    // Show alert icon for credential name field
    if (alertIcon && fieldName === 'CredentialName') {
      alertIcon.style.display = 'block';
      console.log('[VALIDATION] Showing alert icon');
    }
  } else {
    console.log('[VALIDATION] Field is valid');
    // Remove error - restore original color
    input.classList.remove('error');
    if (descriptionElement) {
      descriptionElement.classList.remove('error');
      console.log('[VALIDATION] Removed error class from description');
    }
    // Hide alert icon
    if (alertIcon && fieldName === 'CredentialName') {
      alertIcon.style.display = 'none';
      console.log('[VALIDATION] Hiding alert icon');
    }
  }
}

function updateButtonState() {
  console.log('[BUTTON STATE] Updating button state...');
  
  const createButton = document.querySelector('.create-button');
  if (!createButton) {
    console.log('[BUTTON STATE] Create button not found');
    return;
  }

  const isCredentialNameValid = validationState.CredentialName.valid;
  const isAllowedOriginsValid = validationState.AllowedOrigins.valid;
  const isCredentialNameFilled = formData.CredentialName.trim() !== '';
  const isAgreementChecked = formData.AdobeDeveloperConsole;

  console.log('[BUTTON STATE] Validation state:', {
    credentialNameFilled: isCredentialNameFilled,
    credentialNameValid: isCredentialNameValid,
    allowedOriginsValid: isAllowedOriginsValid,
    agreementChecked: isAgreementChecked
  });

  const shouldDisable = !isCredentialNameFilled || !isCredentialNameValid || !isAllowedOriginsValid || !isAgreementChecked;
  console.log('[BUTTON STATE] Should disable:', shouldDisable);

  if (shouldDisable) {
    console.log('[BUTTON STATE] Disabling button');
    createButton.setAttribute('disabled', 'true');
    createButton.style.opacity = '0.4';
    createButton.style.cursor = 'not-allowed';
  } else {
    console.log('[BUTTON STATE] Enabling button');
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
  const handleReturnOrgChange = async (newOrg) => {
    try {
      // Use switchOrganization function
      await switchOrganization(newOrg);
      
      console.log('Organization changed on return page to:', selectedOrganization);
      
      // Update org notice text
      const orgNotice = getCredHeader.querySelector('.org-notice-return');
      if (orgNotice) {
        const orgText = orgNotice.querySelector('.org-text');
        if (orgText) {
          orgText.textContent = `You're viewing in ${selectedOrganization.name}  `;
        }
      }
      
      // Refresh credentials for new org
      fetchExistingCredentials(selectedOrganization?.code).then(async (existingCreds) => {
        console.log('[ORG CHANGE] Fetched credentials for new org:', existingCreds);
        console.log('[ORG CHANGE] Is Array?:', Array.isArray(existingCreds));
        
        if (existingCreds) {
          // Pass the data in consistent format (handle both array and object responses)
          const dataToPass = Array.isArray(existingCreds) 
            ? { projects: existingCreds } 
            : existingCreds;
          
          console.log('[ORG CHANGE] Data structure being passed:', dataToPass);
          
          // Populate dropdown with new org's projects (filter from cached data)
          const hasProjects = populateProjectsDropdown(returnWrapper, dataToPass);
          
          if (!hasProjects) {
            console.log('[ORG CHANGE] No projects in new org, staying on return page');
          }
        }
      }).catch(error => {
        console.error('[ORG CHANGE] Error fetching credentials:', error);
      });
    } catch (error) {
      console.error('Error switching organization on return page:', error);
      alert('Failed to switch organization. Please try again.');
    }
  };
  
  getCredHeader.appendChild(createOrgNotice(
    `You're viewing in ${selectedOrganization?.name || 'your personal developer organization'}  `,
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
    dropdown.disabled = true; // Disabled until projects are loaded
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
  console.log('='.repeat(80));
  console.log('[DECORATE] Starting GetCredential block initialization...');
  console.log('='.repeat(80));
  
  const pathPrefix = getMetadata('pathprefix').replace(/^\/|\/$/g, '');
  const navPath = `${window.location.origin}/${pathPrefix}/credential/getcredential.json`;
  console.log('[DECORATE] Config path:', navPath);

  let credentialData;
  try {
    console.log('[DECORATE] Fetching configuration...');
    const response = await fetch(navPath);
    console.log('[DECORATE] Config response status:', response.status);
    
    if (!response.ok) throw new Error('Failed to load');

    const credentialJSON = await response.json();
    console.log('[DECORATE] Config loaded:', credentialJSON);
    
    credentialData = credentialJSON?.data?.[0]?.['GetCredential']?.components;
    console.log('[DECORATE] Credential data extracted:', credentialData);

    if (!credentialData) {
      console.error('[DECORATE] No credential data available');
      block.innerHTML = '<p>No credential data available.</p>';
      return;
    }
    
    console.log('[DECORATE] Configuration loaded successfully');

    // Extract template and organization data for API calls
    const getCredConfig = credentialJSON?.data?.[0]?.['GetCredential'];
    
    // Update templateData only if not hardcoded
    if (templateData === "664e39607dcc7c0e5a4a035b" || !templateData) {
      templateData = getCredConfig?.template || {
        id: templateData || 'default-template-id',
        orgId: 'default-org-id',
        apis: credentialData.Form?.components?.Products?.items?.map(item => ({
          code: item.Product?.code || 'cc-embed',
          credentialType: 'apikey',
          flowType: 'public',
          licenseConfigs: []
        })) || []
      };
    }

    // =========================================================================
    // ORGANIZATION INITIALIZATION
    // =========================================================================
    // This section handles organization loading on initial page load:
    // 1. If user is signed in:
    //    - Fetch all organizations from API
    //    - Call switchOrganization(null) which:
    //      a) Checks localStorage for saved org
    //      b) Validates user still has access to saved org
    //      c) If no saved/valid org, picks first org from list as default
    //      d) Saves selected org to localStorage
    // 2. If user is NOT signed in:
    //    - Use fallback org from config
    // =========================================================================
    
    console.log('[DECORATE] Checking if user is signed in...');
    if (window.adobeIMS && window.adobeIMS.isSignedInUser()) {
      console.log('[DECORATE] User is signed in, fetching organizations...');
      
      try {
        const orgs = await fetchOrganizations();
        
        if (orgs && orgs.length > 0) {
          organizationsData = orgs;
          console.log('[DECORATE] Organizations loaded:', organizationsData.length, 'organizations');
          
          // Initialize organization (from localStorage or default)
          console.log('[DECORATE] Initializing organization...');
          await switchOrganization(null);
          console.log('[DECORATE] Organization initialized:', selectedOrganization);
        } else {
          console.log('[DECORATE] No organizations found, using default');
          // Fallback to config-based organization
          selectedOrganization = {
            code: getCredConfig?.orgId || (typeof templateData === 'string' ? 'default-org-id' : templateData.orgId),
            name: getCredConfig?.orgName || 'Personal Developer Organization'
          };
        }
      } catch (error) {
        console.error('[DECORATE] Error fetching/initializing organization:', error);
        // Fallback to config-based organization
        selectedOrganization = {
          code: getCredConfig?.orgId || (typeof templateData === 'string' ? 'default-org-id' : templateData.orgId),
          name: getCredConfig?.orgName || 'Personal Developer Organization'
        };
      }
    } else {
      console.log('[DECORATE] User not signed in, using fallback organization');
      // Get organization data from config as fallback (when not signed in)
      selectedOrganization = {
        code: getCredConfig?.orgId || (typeof templateData === 'string' ? 'default-org-id' : templateData.orgId),
        name: getCredConfig?.orgName || 'Personal Developer Organization'
      };
    }
    
    console.log('[DECORATE] Selected organization ready:', selectedOrganization);
    console.log('='.repeat(80));
    console.log('[DECORATE] INITIALIZATION SUMMARY');
    console.log('[DECORATE] Total Organizations Available:', organizationsData?.length || 0);
    console.log('[DECORATE] Selected Organization:', {
      name: selectedOrganization?.name,
      code: selectedOrganization?.code,
      accountId: selectedOrganization?.accountId
    });
    console.log('[DECORATE] Template Data:', typeof templateData === 'string' ? templateData : templateData?.id);
    console.log('[DECORATE] localStorage Key:', LOCAL_STORAGE_ORG_KEY);
    const savedOrg = localStorage.getItem(LOCAL_STORAGE_ORG_KEY);
    console.log('[DECORATE] Organization in localStorage:', savedOrg ? JSON.parse(savedOrg).name : 'None');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('[DECORATE] Fatal error during initialization:', error);
    block.innerHTML = '<p>Error loading credential data.</p>';
    return;
  }

  block.innerHTML = '';
  console.log('[DECORATE] Starting UI construction...');

  // Create sign-in container
  let signInContainer;
  if (credentialData.SignIn) {
    // Check if user is already signed in to hide sign-in page initially
    const isAlreadySignedIn = window.adobeIMS && window.adobeIMS.isSignedInUser();
    const signInClass = isAlreadySignedIn ? 'sign-in-container hidden' : 'sign-in-container';
    
    signInContainer = createTag('div', { class: signInClass });
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

  // Create return container (previously created projects)
  let returnContainer;
  if (credentialData.Return) {
    // Show return page if user is already signed in
    const isAlreadySignedIn = window.adobeIMS && window.adobeIMS.isSignedInUser();
    
    // Always create return container as hidden initially
    returnContainer = createTag('div', { class: 'return-container hidden' });
    returnContainer.appendChild(createReturnContent(credentialData.Return));
    block.appendChild(returnContainer);

    // Fetch credentials if user is signed in (organizations already loaded above)
    if (isAlreadySignedIn) {
      console.log('[RETURN PAGE] User already signed in, showing loading and fetching credentials...');
      console.log('[RETURN PAGE] Using organization:', selectedOrganization);
      
      // Show loading page while fetching
      setLoadingText(loadingContainer, 'Loading...');
      navigateTo(signInContainer, loadingContainer);
      
      // Fetch existing credentials (organizations were already fetched above)
      fetchExistingCredentials(selectedOrganization?.code).then(async (existingCreds) => {
        console.log('[RETURN PAGE] ===== API RESPONSE RECEIVED =====');
        console.log('[RETURN PAGE] Existing credentials FULL data:', existingCreds);
        console.log('[RETURN PAGE] Is Array?:', Array.isArray(existingCreds));
        console.log('[RETURN PAGE] Has .projects property?:', !!existingCreds?.projects);
        
        // Handle both response formats: direct array or object with .projects
        const projectsArray = Array.isArray(existingCreds) ? existingCreds : existingCreds?.projects;
        console.log('[RETURN PAGE] Projects array:', projectsArray);
        console.log('[RETURN PAGE] Projects count:', projectsArray?.length || 0);
        console.log('[RETURN PAGE] First project:', projectsArray?.[0]);
        
        if (projectsArray && projectsArray.length > 0) {
          console.log('[RETURN PAGE] ✅ CONDITION PASSED: Has', projectsArray.length, 'projects');
          console.log('[RETURN PAGE] returnContainer exists?:', !!returnContainer);
          console.log('[RETURN PAGE] Calling populateProjectsDropdown...');
          
          // Pass the data in consistent format (handle both array and object responses)
          const dataToPass = Array.isArray(existingCreds) 
            ? { projects: existingCreds } 
            : existingCreds;
          
          console.log('[RETURN PAGE] Data structure being passed:', dataToPass);
          
          // Populate dropdown and update card with projects (filter from cached data)
          const hasProjects = populateProjectsDropdown(returnContainer, dataToPass);
          
          console.log('[RETURN PAGE] ===== populateProjectsDropdown RETURNED:', hasProjects, '=====');
          
          if (!hasProjects) {
            // No projects found - navigate to form to create first credential
            console.log('[RETURN PAGE] No projects after population, navigating to form...');
            navigateTo(loadingContainer, formContainer);
          } else {
            console.log('[RETURN PAGE] ===== HIDING LOADING, SHOWING RETURN PAGE =====');
            console.log('[RETURN PAGE] Projects loaded and card updated successfully');
            // Hide loading and show return page with populated data
            navigateTo(loadingContainer, returnContainer);
            console.log('[RETURN PAGE] ===== RETURN PAGE NOW VISIBLE =====');
          }
        } else {
          // Failed to fetch credentials or no projects - navigate to form
          console.log('[RETURN PAGE] No projects found in API response, navigating to form...');
          navigateTo(loadingContainer, formContainer);
        }
      }).catch(error => {
        console.error('[RETURN PAGE] Error loading credentials:', error);
        console.error('[RETURN PAGE] Error stack:', error.stack);
        // On error, navigate to form
        navigateTo(loadingContainer, formContainer);
      });
    }
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
    const handleOrgChange = async (newOrg) => {
      try {
        // Use switchOrganization function
        await switchOrganization(newOrg);
        
        console.log('Organization changed to:', selectedOrganization);
        
        // Update org notice text
        const orgNotice = formHeader.querySelector('.org-notice');
        if (orgNotice) {
          const orgText = orgNotice.querySelector('.org-text');
          if (orgText) {
            orgText.textContent = `You're creating this credential in ${selectedOrganization.name}  `;
          }
        }
        
        // Reset form data if needed (e.g., agreement checkbox)
        if (formData.Agree) {
          formData.Agree = false;
          const agreeCheckbox = formFields.querySelector('input[type="checkbox"]');
          if (agreeCheckbox) {
            agreeCheckbox.checked = false;
          }
        }
      } catch (error) {
        console.error('Error switching organization:', error);
        alert('Failed to switch organization. Please try again.');
      }
    };
    
    formHeader.appendChild(createOrgNotice(
      `You're creating this credential in ${selectedOrganization?.name || 'your personal developer organization'}  `,
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
    if(window.adobeIMS.isSignedInUser()) { 
      navigateTo(signInContainer, returnContainer);
     }
     else{
       window.adobeIMS.signIn();
     }

  });

  returnContainer?.querySelector('.create-new-button')?.addEventListener('click', async () => {
    console.log('[CREATE NEW] Create new credential button clicked');
    console.log('[CREATE NEW] Organizations data:', organizationsData?.length || 0, 'orgs');
    console.log('[CREATE NEW] Selected organization:', selectedOrganization);
    
    // Ensure organizations are loaded
    if (!organizationsData || organizationsData.length === 0) {
      console.log('[CREATE NEW] Organizations not loaded, fetching now...');
      try {
        const orgs = await fetchOrganizations();
        if (orgs && orgs.length > 0) {
          organizationsData = orgs;
          await switchOrganization(null);
          console.log('[CREATE NEW] Organizations loaded:', organizationsData.length);
        }
      } catch (error) {
        console.error('[CREATE NEW] Error loading organizations:', error);
      }
    }
    
    // Ensure organization is selected
    if (!selectedOrganization) {
      console.log('[CREATE NEW] No organization selected, initializing...');
      try {
        await switchOrganization(null);
        console.log('[CREATE NEW] Organization selected:', selectedOrganization);
      } catch (error) {
        console.error('[CREATE NEW] Error selecting organization:', error);
        alert('Unable to load organization. Please refresh the page.');
        return;
      }
    }
    
    // Clear the form before navigating
    clearForm(formContainer);
    
    console.log('[CREATE NEW] Navigating to form page...');
    navigateTo(returnContainer, formContainer, true);
  });

  formContainer?.querySelector('.create-button')?.addEventListener('click', async (e) => {
    console.log('[FORM SUBMIT] Create button clicked');
    e.preventDefault();
    
    // Validate all fields before submission
    const isCredentialNameValid = validationState.CredentialName.valid;
    const isAllowedOriginsValid = validationState.AllowedOrigins.valid;
    const isCredentialNameFilled = formData.CredentialName.trim() !== '';
    const isAgreementChecked = formData.AdobeDeveloperConsole;

    console.log('[FORM SUBMIT] Validation check:', {
      credentialNameFilled: isCredentialNameFilled,
      credentialNameValid: isCredentialNameValid,
      allowedOriginsValid: isAllowedOriginsValid,
      agreementChecked: isAgreementChecked
    });

    if (!isCredentialNameFilled || !isCredentialNameValid || !isAllowedOriginsValid || !isAgreementChecked) {
      console.log('[FORM SUBMIT] Validation failed, aborting submission');
      return;
    }

    console.log('[FORM SUBMIT] Validation passed, proceeding with creation');
    console.log('[FORM SUBMIT] Form data:', formData);

    // Show loading page with "Creating credentials..." text
    console.log('[FORM SUBMIT] Showing loading page...');
    setLoadingText(loadingContainer, 'Creating credentials...');
    navigateTo(formContainer, loadingContainer);

    try {
      // Call API to create credential
      console.log('[FORM SUBMIT] Calling createCredential API...');
      const result = await createCredential();
      console.log('[FORM SUBMIT] API result:', result);
      
      if (result?.success) {
        // Store response data
        credentialResponse = result.data;
        console.log('[FORM SUBMIT] API Response received - Credential created successfully');
        console.log('[FORM SUBMIT] Response data:', credentialResponse);
        
        // Update card with dynamic values
        console.log('[FORM SUBMIT] Updating credential card...');
        updateCredentialCard(cardContainer, credentialResponse);
        console.log('[FORM SUBMIT] Card updated');
        
        // API response received - Hide loading page and show success card
        console.log('[FORM SUBMIT] Hiding loading page and showing success card...');
        navigateTo(loadingContainer, cardContainer, true);
      } else {
        console.log('[FORM SUBMIT] API returned non-success result');
        // API response received (failed) - Hide loading and show form again
        console.log('[FORM SUBMIT] Hiding loading page and returning to form...');
        navigateTo(loadingContainer, formContainer);
      }
    } catch (error) {
      // API error - Show error message
      console.error('[FORM SUBMIT] API Error:', error);
      
      // API error received - Hide loading and show form again
      console.log('[FORM SUBMIT] Hiding loading page due to error...');
      navigateTo(loadingContainer, formContainer);
      
      alert(`Error: ${error.message}`);
    }
  });

  formContainer?.querySelector('.cancel-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(formContainer, returnContainer);
  });

  cardContainer?.querySelector('.restart-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[RESTART LINK] Restart and create new credential clicked');
    
    // Clear the form before navigating
    clearForm(formContainer);
    
    console.log('[RESTART LINK] Navigating to form page...');
    navigateTo(cardContainer, formContainer, true);
  });

  // ============================================================================
  // IMS AUTHENTICATION HANDLERS
  // ============================================================================
  
  // Handle IMS callback after sign-in redirect
  const handleIMSCallback = () => {
    console.log('[IMS CALLBACK] Checking for IMS callback...');
    const hash = window.location.hash;
    console.log('[IMS CALLBACK] Current hash:', hash);
    
    if (hash && hash.includes('access_token=')) {
      console.log('[IMS CALLBACK] IMS callback detected - access token in URL');
      console.log('[IMS CALLBACK] Cleaning URL...');
      window.history.replaceState(null, '', window.location.pathname);
      console.log('[IMS CALLBACK] URL cleaned');
      
      // Show loading page during sign-in process
      console.log('[IMS CALLBACK] Showing loading page...');
      setLoadingText(loadingContainer, 'Loading...');
      navigateTo(signInContainer, loadingContainer);
      
      // Wait for IMS to process the token
      if (window.adobeIMS) {
        console.log('[IMS CALLBACK] Waiting for IMS to process token...');
        const checkSignIn = setInterval(() => {
          const isSignedIn = window.adobeIMS.isSignedInUser();
          console.log('[IMS CALLBACK] Checking sign-in status:', isSignedIn);
          
          if (isSignedIn) {
            clearInterval(checkSignIn);
            console.log('[IMS CALLBACK] User signed in successfully');
            
            // Fetch organizations first
            console.log('[IMS CALLBACK] Fetching organizations...');
            fetchOrganizations().then(async orgs => {
              if (orgs && orgs.length > 0) {
                organizationsData = orgs;
                console.log('[IMS CALLBACK] Organizations loaded:', organizationsData.length, 'orgs');
                
                // Initialize organization (from localStorage or default)
                try {
                  console.log('[IMS CALLBACK] Initializing organization...');
                  await switchOrganization(null);
                  console.log('[IMS CALLBACK] Organization initialized:', selectedOrganization);
                } catch (error) {
                  console.error('[IMS CALLBACK] Error initializing organization:', error);
                }
              }
              
              // Fetch existing credentials
              console.log('[IMS CALLBACK] Fetching existing credentials...');
              return fetchExistingCredentials(selectedOrganization?.code);
            }).then(async (existingCreds) => {
              console.log('[IMS CALLBACK] Existing credentials loaded:', existingCreds);
              console.log('[IMS CALLBACK] Is Array?:', Array.isArray(existingCreds));
              
              if (existingCreds) {
                // Pass the data in consistent format (handle both array and object responses)
                const dataToPass = Array.isArray(existingCreds) 
                  ? { projects: existingCreds } 
                  : existingCreds;
                
                console.log('[IMS CALLBACK] Data structure being passed:', dataToPass);
                
                // Populate dropdown and update card (filter from cached data)
                const hasProjects = populateProjectsDropdown(returnContainer, dataToPass);
                
                if (!hasProjects) {
                  // No projects - navigate to form instead of return page
                  console.log('[IMS CALLBACK] No projects found, navigating to form...');
                  navigateTo(loadingContainer, formContainer);
                  return;
                }
              }
              
              // API response received - hide loading and show return page
              console.log('[IMS CALLBACK] API calls complete, hiding loading page...');
              console.log('[IMS CALLBACK] Navigating to return page...');
              navigateTo(loadingContainer, returnContainer);
            }).catch(error => {
              console.error('[IMS CALLBACK] Error during setup:', error);
              // On error, hide loading and still navigate to return page
              console.log('[IMS CALLBACK] Hiding loading page due to error...');
              navigateTo(loadingContainer, returnContainer);
            });
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkSignIn);
          console.log('[IMS CALLBACK] Sign-in check timeout');
        }, 5000);
      } else {
        console.log('[IMS CALLBACK] adobeIMS not available');
      }
    } else {
      console.log('[IMS CALLBACK] No IMS callback in URL');
    }
  };

  // Check for IMS callback on page load
  handleIMSCallback();

  // Check when IMS loads
  window.addEventListener('adobeIMS:loaded', handleIMSCallback);

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
