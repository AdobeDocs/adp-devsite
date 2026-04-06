import { createTag } from '../../scripts/lib-adobeio.js';
import { fetchDiscoveryInterface } from '../../scripts/lib-helix.js';

function resolveCompaniesUrl(cfg) {
  const url = cfg.actions?.apiEndpoint;
  return String(url || '').trim();
}

/** Copy from optional sheet `messages` column group, else `fallback`. */
function configMessage(cfg, key, fallback) {
  const v = cfg.messages?.[key];
  return v != null && String(v).length > 0 ? v : fallback;
}

/**
 * Unwraps Franklin sheet `{ data: [...] }` or a JSON string cell; returns plain config object.
 */
function parseDiscoveryConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let base = raw;
  if (Array.isArray(raw.data) && raw.data[0]) {
    base = raw.data[0];
    if (typeof base.DiscoveryInterface === 'string') {
      try {
        base = JSON.parse(base.DiscoveryInterface);
      } catch {
        return null;
      }
    }
  }
  return base && typeof base === 'object' ? base : null;
}

function formatMessage(template, vars) {
  let s = template || '';
  Object.entries(vars).forEach(([k, v]) => {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  });
  return s;
}

/** Adobe Analytics Discovery API: flatten imsOrgs[].companies with imsOrgId. */
function extractCompaniesFromDiscoveryMe(data) {
  if (!data || !Array.isArray(data.imsOrgs)) return [];
  const all = [];
  data.imsOrgs.forEach((org) => {
    if (org.companies && Array.isArray(org.companies)) {
      org.companies.forEach((company) => {
        all.push({ ...company, imsOrgId: org.imsOrgId });
      });
    }
  });
  return all;
}

function extractCompaniesListGeneric(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.companies)) return payload.companies;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function buildCompanySelectOption(row) {
  const id = row.globalCompanyId ?? row.global_company_id ?? row.id ?? row.companyId ?? '';
  const name = row.companyName ?? row.name ?? row.friendlyName ?? row.displayName ?? '';
  const label = name && id ? `${name} (${id})` : String(name || id || 'Company');
  return { id: String(id), label };
}

function buildFetchHeaders(token, cfg) {
  const headers = { accept: 'application/json' };
  const mode = cfg.api?.authMode || 'x-user-auth';
  if (mode === 'bearer') {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['x-user-auth'] = token;
  }
  return headers;
}

export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('discovery-interface');
  block.setAttribute('daa-lh', 'discovery-interface');

  const instanceId = `discovery-interface-${Math.random().toString(36).slice(2, 10)}`;

  const raw = await fetchDiscoveryInterface();
  const cfg = parseDiscoveryConfig(raw);

  if (!cfg) {
    block.innerHTML = '<p>Discovery interface configuration could not be loaded.</p>';
    return;
  }

  const companiesUrl = resolveCompaniesUrl(cfg);
  const method = (cfg.api?.method || 'GET').toUpperCase();

  const card = createTag('div', { class: 'card_developer_console' });
  const root = createTag('div', { class: 'discovery-interface__content' });

  if (cfg.header && String(cfg.header).trim()) {
    const pageTitle = createTag('h2', { class: 'discovery-interface__title' });
    pageTitle.textContent = cfg.header;
    root.append(pageTitle);
  }

  const introStack = createTag('div', { class: 'discovery-interface__stack' });
  const description = createTag('p', {
    class: 'discovery-interface__description spectrum-Body spectrum-Body--sizeM',
    id: `${instanceId}-description`,
  });
  description.textContent = cfg.description ?? '';
  introStack.append(description);

  const fieldStack = createTag('div', { class: 'discovery-interface__stack' });
  const field = createTag('div', { class: 'discovery-interface__field' });
  const tokenLabel = createTag('label', {
    class: 'discovery-interface__label',
    for: `${instanceId}-access-token`,
  });
  tokenLabel.textContent = cfg.accessToken?.label ?? '';
  const tokenInput = createTag('input', {
    class: 'discovery-interface__input',
    id: `${instanceId}-access-token`,
    type: 'text',
    name: 'access-token',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': `${instanceId}-description`,
    placeholder: cfg.accessToken?.placeholder ?? '',
  });

  field.append(tokenLabel, tokenInput);
  fieldStack.append(field);

  const getCompaniesButton = createTag('button', {
    type: 'button',
    class: 'discovery-interface__button-primary',
    disabled: '',
  });
  const getCompaniesSpinner = createTag('span', {
    class: 'discovery-interface__button-spinner discovery-interface__hidden',
    'aria-hidden': 'true',
  });
  const getCompaniesLabel = createTag('span', { class: 'discovery-interface__button-label' });
  getCompaniesLabel.textContent = cfg.actions?.getCompaniesButton ?? '';
  getCompaniesButton.append(getCompaniesSpinner, getCompaniesLabel);

  fieldStack.append(getCompaniesButton);

  const statusRegion = createTag('div', {
    class: 'discovery-interface__banner discovery-interface__hidden',
    role: 'status',
    'aria-live': 'polite',
  });

  const companiesSection = createTag('section', {
    class: 'discovery-interface__companies discovery-interface__hidden',
  });
  const companiesHeading = createTag('h4', {
    class: 'discovery-interface__companies-heading spectrum-Heading spectrum-Heading--sizeS side-header',
  });
  companiesHeading.textContent = cfg.availableCompanies?.title ?? '';
  const companiesDescription = createTag('p', {
    class: 'discovery-interface__companies-description spectrum-Body spectrum-Body--sizeM',
  });
  companiesDescription.textContent = cfg.availableCompanies?.description ?? '';

  const companySelectLabel = createTag('label', {
    class: 'discovery-interface__select-label',
    for: `${instanceId}-company-select`,
  });
  companySelectLabel.textContent = cfg.availableCompanies?.dropdown?.label ?? '';

  const companySelectWrap = createTag('div', { class: 'discovery-interface__select-wrap' });
  const companySelect = createTag('select', {
    class: 'discovery-interface__select',
    id: `${instanceId}-company-select`,
  });
  companySelectWrap.append(companySelectLabel, companySelect);

  const copyCompanyIdButton = createTag('button', {
    type: 'button',
    class: 'discovery-interface__button-copy',
    disabled: '',
  });
  copyCompanyIdButton.textContent = cfg.availableCompanies?.actions?.copyIdButton ?? '';

  const companyControlsRow = createTag('div', {
    class: 'discovery-interface__row discovery-interface__row--align-end',
  });
  companyControlsRow.append(companySelectWrap, copyCompanyIdButton);

  const tip = createTag('p', {
    class: 'discovery-interface__tip spectrum-Body spectrum-Body--sizeM',
  });
  const tipText = cfg.tip ?? '';
  tip.textContent = tipText;

  companiesSection.append(companiesHeading, companiesDescription, companyControlsRow, tip);

  root.append(introStack, fieldStack, statusRegion, companiesSection);
  card.append(root);
  block.append(card);

  let loading = false;
  let companiesRows = [];

  function setLoading(isLoading) {
    loading = isLoading;
    getCompaniesButton.classList.toggle('discovery-interface__button-primary--loading', isLoading);
    getCompaniesSpinner.classList.toggle('discovery-interface__hidden', !isLoading);
    getCompaniesLabel.textContent = isLoading
      ? (cfg.actions?.loading || configMessage(cfg, 'loading', 'Loading...'))
      : (cfg.actions?.getCompaniesButton ?? '');
    syncGetCompaniesButtonDisabled();
  }

  function syncGetCompaniesButtonDisabled() {
    const hasToken = tokenInput.value.trim().length > 0;
    getCompaniesButton.disabled = loading || !hasToken;
  }

  function showStatus(kind, message) {
    statusRegion.textContent = message;
    statusRegion.classList.remove(
      'discovery-interface__hidden',
      'discovery-interface__banner--success',
      'discovery-interface__banner--error',
    );
    statusRegion.classList.add(
      kind === 'error' ? 'discovery-interface__banner--error' : 'discovery-interface__banner--success',
    );
  }

  function hideStatus() {
    statusRegion.classList.add('discovery-interface__hidden');
    statusRegion.textContent = '';
  }

  tokenInput.addEventListener('input', syncGetCompaniesButtonDisabled);
  syncGetCompaniesButtonDisabled();

  function fillCompanies(rows) {
    companiesRows = rows;
    companySelect.innerHTML = '';
    const placeholderText = cfg.availableCompanies?.dropdown?.selected ?? '';
    const placeholderOption = createTag('option', { value: '' });
    placeholderOption.textContent = placeholderText;
    companySelect.append(placeholderOption);

    rows.forEach((r) => {
      const { id, label } = buildCompanySelectOption(r);
      if (!id) return;
      const opt = createTag('option', { value: id });
      opt.textContent = label;
      companySelect.append(opt);
    });

    if (rows.length > 0) {
      companySelect.selectedIndex = 1;
      copyCompanyIdButton.disabled = false;
    } else {
      companySelect.selectedIndex = 0;
      copyCompanyIdButton.disabled = true;
    }

    companiesSection.classList.remove('discovery-interface__hidden');
  }

  getCompaniesButton.addEventListener('click', async () => {
    hideStatus();
    companiesSection.classList.add('discovery-interface__hidden');
    copyCompanyIdButton.disabled = true;
    companySelect.innerHTML = '';
    companiesRows = [];

    const token = tokenInput.value.trim();
    if (!token) {
      showStatus('error', configMessage(cfg, 'noToken', 'Please enter your access token'));
      return;
    }
    if (!companiesUrl) {
      showStatus(
        'error',
        configMessage(cfg, 'noUrl', 'Configure actions.apiEndpoint in the discovery interface sheet.'),
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(companiesUrl, {
        method,
        headers: buildFetchHeaders(token, cfg),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      let list = extractCompaniesFromDiscoveryMe(json);
      if (list.length === 0) {
        list = extractCompaniesListGeneric(json).map((item) => (typeof item === 'object' && item ? item : {}));
      }
      const withIds = list.map(buildCompanySelectOption).filter((o) => o.id);

      const successTemplate = configMessage(
        cfg,
        'success',
        'Successfully retrieved {count} companies',
      );
      showStatus('success', formatMessage(successTemplate, { count: withIds.length }));
      fillCompanies(list);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showStatus('error', `Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  });

  copyCompanyIdButton.addEventListener('click', async () => {
    const selectedId = companySelect.value;
    if (!selectedId) {
      showStatus('error', configMessage(cfg, 'selectFirst', 'Please select a company first'));
      return;
    }
    const selectedRow = companiesRows.find((c) => String(c.globalCompanyId ?? '') === selectedId);
    if (!selectedRow || !selectedRow.globalCompanyId) {
      showStatus('error', configMessage(cfg, 'notFound', 'Selected company not found'));
      return;
    }
    const globalCompanyId = String(selectedRow.globalCompanyId);
    try {
      await navigator.clipboard.writeText(globalCompanyId);
      const copiedTemplate = configMessage(cfg, 'copied', 'Copied "{value}" to clipboard');
      showStatus('success', formatMessage(copiedTemplate, { value: globalCompanyId }));
      window.setTimeout(() => hideStatus(), 3000);
    } catch {
      showStatus('error', configMessage(cfg, 'copyFailed', 'Failed to copy to clipboard'));
    }
  });
}
