import { createTag } from '../../scripts/lib-adobeio.js';
import { fetchDiscoveryInterface } from '../../scripts/lib-helix.js';

const ClassNames = {
  hidden: 'discovery-interface-hidden',
  ok: 'discovery-interface-banner--success',
  err: 'discovery-interface-banner--error',
  loading: 'discovery-interface-button-primary--loading',
};

function apiUrl(config) {
  return String(config.actions?.apiEndpoint || '').trim();
}

function substitute(template, values) {
  return Object.entries(values).reduce(
    (out, [key, val]) => out.replaceAll(`{${key}}`, String(val)),
    template || '',
  );
}

function companiesList(payload) {
  const fromAdobe = [];
  if (payload?.imsOrgs) {
    for (const org of payload.imsOrgs) {
      for (const co of org.companies || []) {
        fromAdobe.push({ ...co, imsOrgId: org.imsOrgId });
      }
    }
  }
  if (fromAdobe.length) return fromAdobe;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['companies', 'content', 'data']) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function optionFromCompanyRow(row) {
  const id = row.globalCompanyId;
  const name = row.companyName;
  const label = name && id ? `${name} (${id})` : String(name || id);
  return { value: String(id), label };
}

function optionEl(value, label) {
  const opt = createTag('option', { value });
  opt.textContent = label;
  return opt;
}

function authHeaders(token, config) {
  const headers = { accept: 'application/json' };
  if (config.api?.authMode === 'bearer') {
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

  const idPrefix = `discovery-interface-${Math.random().toString(36).slice(2, 10)}`;
  const config = (await fetchDiscoveryInterface())?.data[0];
  if (!config) {
    block.innerHTML = '<p>Discovery interface configuration could not be loaded.</p>';
    return;
  }

  const endpoint = apiUrl(config);
  const httpMethod = (config.api?.method || 'GET').toUpperCase();
  const actions = config.actions ?? {};
  const companiesUi = config.availableCompanies ?? {};
  const dropdown = companiesUi.dropdown ?? {};
  const companyActions = companiesUi.actions ?? {};

  const strings = {
    tokenMissing: config.accessToken?.error ?? 'Please enter your access token',
    endpointMissing:
      actions.apiEndpointError ??
      'Configure actions.apiEndpoint in the discovery interface sheet.',
    fetchOk: actions.success ?? 'Successfully retrieved {count} companies',
    loading: actions.loading ?? 'Loading...',
    selectPlaceholder: dropdown.placeholder?.trim() || '-- Select a company --',
    pickCompany: companyActions.selectFirstError ?? 'Please select a company first',
    companyMissing: companyActions.notFoundError ?? 'Selected company not found',
    copied: companyActions.copied ?? 'Copied "{value}" to clipboard',
    copyFailed: companyActions.copyFailedError ?? 'Failed to copy to clipboard',
  };

  const shell = createTag('div', { class: 'card_developer_console' });
  const layout = createTag('div', { class: 'discovery-interface-content' });

  if (config.header && String(config.header).trim()) {
    const title = createTag('h2', {
      class: 'spectrum-Heading spectrum-Heading--sizeM',
    });
    title.textContent = config.header;
    layout.append(title);
  }

  const intro = createTag('div', { class: 'discovery-interface-stack' });
  const description = createTag('p', {
    class: 'discovery-interface-description spectrum-Body spectrum-Body--sizeM',
    id: `${idPrefix}-description`,
  });

  if (config.description) {
    description.textContent = config.description;
  }
  intro.append(description);

  const formColumn = createTag('div', { class: 'discovery-interface-stack' });
  const tokenField = createTag('div', { class: 'discovery-interface-field' });
  const tokenLabel = createTag('label', {
    class: 'discovery-interface-label',
    for: `${idPrefix}-access-token`,
  });
  if (config.accessToken?.label) {
    tokenLabel.textContent = config.accessToken?.label ?? '';
  }
  const tokenInput = createTag('input', {
    class: 'discovery-interface-input',
    id: `${idPrefix}-access-token`,
    type: 'text',
    name: 'access-token',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': `${idPrefix}-description`,
    placeholder: config.accessToken?.placeholder ?? '',
  });
  tokenField.append(tokenLabel, tokenInput);

  const primaryButton = createTag('button', {
    type: 'button',
    class: 'discovery-interface-button-primary',
    disabled: '',
  });
  const buttonSpinner = createTag('span', {
    class: `discovery-interface-button-spinner ${ClassNames.hidden}`,
    'aria-hidden': 'true',
  });
  const buttonLabel = createTag('span', { class: 'discovery-interface-button-label' });
  if (actions.getCompaniesButton) {
    buttonLabel.textContent = actions.getCompaniesButton;
  }
  primaryButton.append(buttonSpinner, buttonLabel);
  formColumn.append(tokenField, primaryButton);

  const statusBanner = createTag('div', {
    class: `discovery-interface-banner ${ClassNames.hidden}`,
    role: 'status',
    'aria-live': 'polite',
  });

  const companySection = createTag('section', {
    class: `discovery-interface-companies ${ClassNames.hidden}`,
  });
  const companyHeading = createTag('h4', {
    class: 'discovery-interface-companies-heading spectrum-Heading spectrum-Heading--sizeS side-header',
  });
  if (companiesUi.title) {
    companyHeading.textContent = companiesUi.title;
  }
  const companyIntro = createTag('p', {
    class: 'discovery-interface-companies-description spectrum-Body spectrum-Body--sizeM',
  });
  if (companiesUi.description) {
    companyIntro.textContent = companiesUi.description;
  }

  const selectLabel = createTag('label', {
    class: 'discovery-interface-select-label',
    for: `${idPrefix}-company-select`,
  });
  if (dropdown.label) {
    selectLabel.textContent = dropdown.label;
  }

  const selectWrap = createTag('div', { class: 'discovery-interface-select-wrap' });
  const companySelect = createTag('select', {
    class: 'discovery-interface-select',
    id: `${idPrefix}-company-select`,
  });
  selectWrap.append(selectLabel, companySelect);

  const copyButton = createTag('button', {
    type: 'button',
    class: 'discovery-interface-button-copy',
    disabled: '',
  });
  if (companyActions.copyIdButton) {
    copyButton.textContent = companyActions.copyIdButton;
  }

  const companyRow = createTag('div', {
    class: 'discovery-interface-row discovery-interface-row--align-end',
  });
  companyRow.append(selectWrap, copyButton);

  const tip = createTag('p', {
    class: 'discovery-interface-tip spectrum-Body spectrum-Body--sizeM',
  });
  if (config.tip) {
    tip.textContent = config.tip;
  }

  companySection.append(companyHeading, companyIntro, companyRow, tip);
  layout.append(intro, formColumn, statusBanner, companySection);
  shell.append(layout);
  block.append(shell);

  let loading = false;
  let companiesLoaded = [];

  function showStatus(kind, text) {
    statusBanner.textContent = text;
    statusBanner.classList.remove(ClassNames.hidden, ClassNames.ok, ClassNames.err);
    statusBanner.classList.add(kind === 'error' ? ClassNames.err : ClassNames.ok);
  }

  function hideStatus() {
    statusBanner.classList.add(ClassNames.hidden);
    statusBanner.textContent = '';
  }

  function updatePrimaryButton() {
    const hasToken = tokenInput.value.trim().length > 0;
    primaryButton.disabled = loading || !hasToken;
  }

  function setLoading(on) {
    loading = on;
    primaryButton.classList.toggle(ClassNames.loading, on);
    buttonSpinner.classList.toggle(ClassNames.hidden, !on);
    if (actions.getCompaniesButton) {
      buttonLabel.textContent = on ? strings.loading : actions.getCompaniesButton;
    }
    updatePrimaryButton();
  }

  tokenInput.addEventListener('input', updatePrimaryButton);
  updatePrimaryButton();

  function refreshCompanySelect(rows) {
    companiesLoaded = rows;
    companySelect.replaceChildren();
    companySelect.append(optionEl('', strings.selectPlaceholder));
    for (const row of rows) {
      const { value, label } = optionFromCompanyRow(row);
      if (!value) continue;
      companySelect.append(optionEl(value, label));
    }
    if (rows.length) {
      companySelect.selectedIndex = 1;
      copyButton.disabled = false;
    } else {
      companySelect.selectedIndex = 0;
      copyButton.disabled = true;
    }
    companySection.classList.remove(ClassNames.hidden);
  }

  primaryButton.addEventListener('click', async () => {
    hideStatus();
    companySection.classList.add(ClassNames.hidden);
    copyButton.disabled = true;
    companySelect.replaceChildren();
    companiesLoaded = [];

    const token = tokenInput.value.trim();
    if (!token) {
      showStatus('error', strings.tokenMissing);
      return;
    }
    if (!endpoint) {
      showStatus('error', strings.endpointMissing);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: httpMethod,
        headers: authHeaders(token, config),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const rows = companiesList(data).map((item) =>
        typeof item === 'object' && item ? item : {},
      );
      const withIds = rows.map(optionFromCompanyRow).filter((o) => o.value);
      showStatus('success', substitute(strings.fetchOk, { count: withIds.length }));
      refreshCompanySelect(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatus('error', `Error: ${message}`);
    } finally {
      setLoading(false);
    }
  });

  copyButton.addEventListener('click', async () => {
    const selected = companySelect.value;
    if (!selected) {
      showStatus('error', strings.pickCompany);
      return;
    }
    const match = companiesLoaded.find((r) => String(r.globalCompanyId ?? '') === selected);
    if (!match?.globalCompanyId) {
      showStatus('error', strings.companyMissing);
      return;
    }
    const id = String(match.globalCompanyId);
    try {
      await navigator.clipboard.writeText(id);
      showStatus('success', substitute(strings.copied, { value: id }));
      window.setTimeout(() => hideStatus(), 3000);
    } catch {
      showStatus('error', strings.copyFailed);
    }
  });
}
