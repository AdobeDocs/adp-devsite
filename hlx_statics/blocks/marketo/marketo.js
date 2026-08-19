/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
 * Marketo Form
 */
import { getMetadata } from '../../scripts/lib-helix.js';
import { createTag } from '../../scripts/lib-adobeio.js';

const parseEncodedConfig = (encodedConfig) => {
  try {
    return JSON.parse(atob(encodedConfig));
  } catch (e) {
    console.error(e);
  }
  return null;
};

const parseJSONStr = (str) => {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const head = document.querySelector('head');
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    head.append(script);
  });
};

const loadLink = (url, attrs) => {
  const head = document.querySelector('head');
  const link = document.createElement('link');
  link.href = url;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      link.setAttribute(key, value);
    }
  }
  head.append(link);
  return link;
};

const localizeLinkAsync = async (href) => href;

const getConfig = () => ({
  base: 'https://milo.adobe.com/libs',
  htmlExclude: [],
});

const createIntersectionObserver = ({ el, callback, options }) => {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        callback(entry.target, entry);
      }
    });
  }, options);
  io.observe(el);
  return io;
};

const SLD = 'adobe';
const MILO_EVENTS = { DEFERRED: 'milo:deferred' };

const replaceKeyArray = async (keys) => {
  const defaults = {
    'marketo-load-error': 'Marketo form did not render',
    'marketo-try-again': 'Try again',
  };
  return keys.map((k) => defaults[k] || k);
};

const ROOT_MARGIN = 50;
const FAILURE_TIMEOUT = 10000;
export const LANA_MESSAGE = {
  RENDER_FAILED: 'Marketo form did not render',
  HANDSHAKE_FAILED: 'Marketo form handshake failed',
  RENDER_RECOVERED: 'Marketo form rendered after timeout',
  SUBMIT_FAILED: 'Marketo form submit failed',
  MARKETO_FORMS_JS: 'Marketo form failed to load forms2.min.js',
};
const FORM_ID = 'form id';
const BASE_URL = 'marketo host';
const MUNCHKIN_ID = 'marketo munckin';
const FORM_STATUS = 'form.status';
const FORM_XDFRAME = 'form.xdframe';
const SUCCESS_TYPE = 'form.success.type';
const SUCCESS_CONTENT = 'form.success.content';
const SUCCESS_SECTION = 'form.success.section';
const SUCCESS_HIDE_SECTION = 'form.success.hide.section';
const FORM_MAP = {
  'success-type': SUCCESS_TYPE,
  'destination-type': SUCCESS_TYPE,
  'success-content': SUCCESS_CONTENT,
  'destination-url': SUCCESS_CONTENT,
  'success-section': SUCCESS_SECTION,
  'success-hide-section': SUCCESS_HIDE_SECTION,
  'co-partner-names': 'program.copartnernames',
  'sfdc-campaign-id': 'program.campaignids.sfdc',
  'poi-field': 'field_filters.products',
  'hardcoded-poi': 'program.poi',
  'cta-override': 'form.cta.override',
};
export const FORM_PARAM = 'form';

const isVisible = (el) => !!el && (typeof el.checkVisibility === 'function'
  ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  : !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));

export const setDataLayer = (key = '', value = '') => {
  window.mcz_marketoForm_pref = window.mcz_marketoForm_pref || {};
  window.mcz_marketoForm_pref[key] = value;
  const dotKey = key.replace(/\s+/g, '.');
  if (!value || !dotKey.includes('.')) return;
  const keyParts = dotKey.split('.');
  const lastKey = keyParts.pop();
  const formDataObject = keyParts.reduce((obj, part) => {
    obj[part] = obj[part] || {};
    return obj[part];
  }, window.mcz_marketoForm_pref);
  formDataObject[lastKey] = value;
};

export const setDataLayerObj = (formData) => {
  Object.entries(formData).forEach(([key, value]) => setDataLayer(key, value));
};

export const getDataLayer = (key = '') => key
  .split('.')
  .reduce((obj, part) => obj?.[part], window.mcz_marketoForm_pref);

export const formValidate = (formEl) => {
  formEl.classList.remove('hide-errors');
  formEl.classList.add('show-warnings');
};

export const decorateURL = async (destination, baseURL = window.location) => {
  if (!destination || !(destination.startsWith('http') || destination.startsWith('/'))) return null;

  try {
    let destinationUrl = new URL(destination, baseURL.origin);
    const { hostname, pathname, search, hash } = destinationUrl;

    const { htmlExclude } = getConfig();
    const exclude = htmlExclude?.some((excludeRe) => excludeRe.test(destinationUrl));

    /* c8 ignore next 3 */
    if (!hostname) {
      throw new Error('URL does not have a valid host');
    }

    if (destinationUrl.hostname.includes(`.${SLD}.`)) {
      destinationUrl = new URL(`${pathname}${search}${hash}`, baseURL.origin);
    }

    const hasFileExtension = /\.[^/.]+$/.test(pathname);
    if (baseURL.pathname.endsWith('.html') && !hasFileExtension && !pathname.endsWith('/') && !exclude) {
      destinationUrl.pathname = `${pathname}.html`;
    }

    const localized = await localizeLinkAsync(destinationUrl.href, null, true);
    destinationUrl.pathname = new URL(localized, baseURL.origin).pathname;

    return destinationUrl.href;
  } catch (e) {
    /* c8 ignore next 4 */
    window.lana?.log(`Error with Marketo destination URL: ${destination} ${e.message}`, { tags: 'marketo', severity: 'e' });
  }

  return null;
};

const showSuccessSection = (formData) => {
  const show = async (sections) => {
    sections.forEach((section) => section.classList.remove('hide-block'));
    await new Promise((resolve) => { setTimeout(resolve, 300); });
    const pageTop = document.querySelector('header')?.offsetHeight ?? 0;
    const targetPosition = sections[0]?.getBoundingClientRect().top ?? 0;
    const offsetPosition = targetPosition + window.scrollY - pageTop;
    window.scrollTo(0, offsetPosition);
  };

  const showClass = formData[SUCCESS_SECTION]?.toLowerCase().replaceAll(' ', '-');
  if (!showClass) {
    window.lana?.log('Error showing Marketo success section', { tags: 'marketo', severity: 'w' });
    return;
  }

  let successSections = document.querySelectorAll(`.section.${showClass}`);
  show(successSections);
  document.addEventListener(
    MILO_EVENTS.DEFERRED,
    () => {
      successSections = document.querySelectorAll(`.section.${showClass}`);
      show(successSections);
      /* c8 ignore next 3 */
      if (!document.querySelector(`.section.${showClass}`)) {
        window.lana?.log(`Error showing Marketo success section ${showClass}`, { tags: 'marketo', severity: 'w' });
      }
    },
    false,
  );
};

const hideSuccessSection = (formData) => {
  const hide = (sections) => {
    sections.forEach((section) => section.classList.add('hide-block'));
  };

  const hideClass = formData[SUCCESS_HIDE_SECTION]?.toLowerCase().replaceAll(' ', '-');
  if (!hideClass) {
    window.lana?.log('Error hiding Marketo success section', { tags: 'marketo', severity: 'w' });
    return;
  }

  let hideSections = document.querySelectorAll(`.section.${hideClass}`);
  hide(hideSections);
  document.addEventListener(
    MILO_EVENTS.DEFERRED,
    () => {
      hideSections = document.querySelectorAll(`.section.${hideClass}`);
      hide(hideSections);
      /* c8 ignore next 3 */
      if (!document.querySelector(`.section.${hideClass}`)) {
        window.lana?.log(`Error hiding Marketo success section ${hideClass}`, { tags: 'marketo', severity: 'w' });
      }
    },
    false,
  );
};

export const debugTags = () => {
  const len = document.cookie.length;
  const tags = ['marketo'];
  const signedIn = window.adobeIMS?.isSignedInUser();
  const frameStatus = getDataLayer(FORM_XDFRAME);
  if (getDataLayer('form.id')) tags.push(`form-${getDataLayer('form.id')}`);
  if (getDataLayer('program.id')) tags.push(`program-${getDataLayer('program.id')}`);
  if (getDataLayer(FORM_STATUS)) tags.push(`status-${getDataLayer(FORM_STATUS)}`);
  if (len >= 8192) tags.push('cookie-8k');
  else if (len >= 6144) tags.push('cookie-6k');
  else if (len >= 4096) tags.push('cookie-4k');
  tags.push(`ims-${signedIn ? 'signed-in' : 'signed-out'}`);
  tags.push(frameStatus === 'ready' ? 'sync-ok' : 'sync-error');
  if (getDataLayer('form.progressive')) tags.push('progressive');
  if (getDataLayer('profile.known_visitor') === true) tags.push('known-visitor');
  tags.push(`pref-lang-${getDataLayer('profile.prefLanguage') ?? ''}`);
  return tags;
};

const decorateOverlay = async (el, message, callback) => {
  if (el.querySelector('.marketo-overlay')) return;
  const [errorRefresh, tryAgain] = await replaceKeyArray(['marketo-load-error', 'marketo-try-again'], getConfig());
  const formEl = el.querySelector('form');
  if (formEl) formEl.inert = true;
  const searchParams = new URLSearchParams(window.location.search);
  const debugMsg = searchParams.get('preview') === '1' ? message : '';
  const errorMessage = createTag('p', { class: 'error', id: 'marketo-error-message' }, errorRefresh);
  const formError = createTag('div', { class: 'error-container' }, errorMessage);
  if (debugMsg) {
    const debugInfo = createTag('p', { class: 'debug-info' });
    debugInfo.textContent = debugMsg;
    formError.appendChild(debugInfo);
  }
  const retryButton = createTag('button', { class: 'retry-button' }, tryAgain);
  formError.appendChild(retryButton);
  const errorOverlay = createTag(
    'div',
    {
      class: 'marketo-overlay',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'marketo-error-message',
    },
    formError,
  );

  retryButton.addEventListener('click', () => {
    /* c8 ignore next 3 */
    if (formEl) formEl.inert = false;
    errorOverlay.remove();
    if (callback) callback();
  });

  el.appendChild(errorOverlay);
};

export const logFailure = (el, msg) => {
  if (el.dataset.mktoFailed) return;
  const tags = debugTags();
  el.dataset.mktoFailed = 'true';
  window.lana?.log(msg, { tags: tags.join(','), severity: 'e', sampleRate: 100 });
  decorateOverlay(el, `${msg}: ${tags.join(', ')}`, () => { window.location.reload(); });
};

export const formTimeout = (el, condition, message, timeout = FAILURE_TIMEOUT) => {
  setTimeout(() => {
    if (condition()) {
      logFailure(el, message);
    }
  }, timeout);
};

const toggleSuccessSection = (formData) => {
  showSuccessSection(formData);
  hideSuccessSection(formData);
};

export const formSubmit = (formEl) => {
  const el = formEl.closest('.marketo');
  const testRecord = window.mkto_isTestRecord?.();
  if (testRecord && testRecord !== 'not_test') return;
  formTimeout(el, () => !el.classList.contains('success'), LANA_MESSAGE.SUBMIT_FAILED);
};

export const formSuccess = (formEl, formData) => {
  const el = formEl.closest('.marketo');
  const parentModal = formEl?.closest('.dialog-modal');
  const mktoSubmit = new Event('mktoSubmit');

  el.classList.add('success');
  window.dispatchEvent(mktoSubmit);
  window.mktoSubmitted = true;

  if (formData?.[SUCCESS_TYPE] === 'ims') {
    const redirect = getMetadata('marketo-ims-redirect');

    if (!redirect?.startsWith('https://')) {
      window?.lana.log('Marketo IMS failure, full url needed for redirect', { tags: 'marketo', severity: 'i' });
      return false;
    }

    const emailInput = formEl.querySelector('input[name="Email"]');
    const email = emailInput?.value;
    const param = getMetadata('marketo-ims');

    if (param && email) {
      window.location.href = `${redirect}?${param}=${encodeURIComponent(email)}`;
    } else {
      window?.lana.log('Marketo IMS failure, missing data', { tags: 'marketo', severity: 'e' });
    }
    return false;
  }

  /* c8 ignore next 5 */
  if (parentModal) {
    const closeButton = parentModal.querySelector('.dialog-close');
    closeButton.click();
    return false;
  }

  if (formData?.[SUCCESS_TYPE] === 'redirect' && formData?.[SUCCESS_CONTENT]) {
    window.location.assign(formData[SUCCESS_CONTENT]);
    return false;
  }

  if (formData?.[SUCCESS_TYPE] !== 'section') return true;
  toggleSuccessSection(formData);
  setDataLayer(SUCCESS_TYPE, 'message');
  return false;
};

const readyForm = (form, formData) => {
  const formEl = form.getFormElem().get(0);
  const el = formEl.closest('.marketo');

  // Clear cookie-prefilled fields if configured
  if (formData.prefillFields) {
    try {
      const prefills = typeof formData.prefillFields === 'string' ? JSON.parse(formData.prefillFields) : formData.prefillFields;
      const clearVals = {};
      Object.keys(prefills).forEach(key => clearVals[key] = '');
      form.vals(clearVals);
    } catch (e) {
      window.lana?.log(`Failed to parse prefillFields: ${e.message}`, { tags: 'marketo', severity: 'w' });
    }
  }

  // Inject additional fields externally
  if (formData['additional-fields']) {
    try {
      const additionalFields = JSON.parse(formData['additional-fields']);
      
      setTimeout(() => {
        // Hide internal Marketo elements that we are replacing/bypassing
        const buttonRow = formEl.querySelector('.mktoButtonRow');
        if (buttonRow) buttonRow.style.setProperty('display', 'none', 'important');
        
        const consentRow = formEl.querySelector('.mktoFormRow.by-supplyingmycontac') || formEl.querySelector('.mktoFormRow.adobe-privacy');
        if (consentRow) consentRow.style.setProperty('display', 'none', 'important');
        
        const legend = consentRow ? consentRow.querySelector('legend') : null;
        
        const container = formEl.parentNode;
        let insertNode = formEl.nextSibling;
        
        // Container for custom fields
        const customFieldsContainer = document.createElement('div');
        customFieldsContainer.className = 'marketo-custom-fields';
        
        additionalFields.forEach((field) => {
          const div = document.createElement('div');
          div.style.cssText = 'margin: 8px 0; text-align: left;';
          div.className = 'custom-field-wrapper';
          
          let fieldHTML = '';
          const requiredMark = field.required ? '<span style="color:#d0021b;">*</span>' : '';
          const commonAttrs = `id="custom-${field.name}" style="width:100%;box-sizing:border-box;font-size:16px;padding:8px;border:1px solid #6e6e6e;border-radius:4px;" ${field.placeholder ? `placeholder="${field.placeholder}"` : ''} ${field.required ? 'data-required="true"' : ''}`;
          
          if (field.type === 'textarea') {
            fieldHTML = `<textarea ${commonAttrs} rows="${field.rows || 6}"></textarea>`;
          } else if (field.type === 'select') {
            const options = Array.isArray(field.options) ? field.options.map(opt => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join('') : '';
            fieldHTML = `<select ${commonAttrs}>
              ${field.placeholder ? `<option value="">${field.placeholder}</option>` : ''}
              ${options}
            </select>`;
          } else {
            fieldHTML = `<input type="${field.type || 'text'}" ${commonAttrs} />`;
          }
          
          div.innerHTML = `
            <label style="display:block;font-size:14px;font-weight:700;margin-bottom:4px;">${field.label} ${requiredMark}</label>
            ${fieldHTML}
          `;
          customFieldsContainer.appendChild(div);
        });
        
        container.insertBefore(customFieldsContainer, insertNode);
        insertNode = customFieldsContainer.nextSibling;
        
        // Submit Button
        const submitDiv = document.createElement('div');
        submitDiv.style.cssText = 'text-align:center; margin: 16px 0;';
        submitDiv.innerHTML = `<button id="custom-submit-btn" style="background-color:#1473e6;color:#fff;border:none;border-radius:16px;font-size:15px;font-weight:700;padding:8px 24px;cursor:pointer;">Submit</button>`;
        container.insertBefore(submitDiv, insertNode);
        insertNode = submitDiv.nextSibling;
        
        // Consent Text
        if (legend) {
          const consentDiv = document.createElement('div');
          consentDiv.style.cssText = 'font-size:12px; color:#444; line-height:1.5; margin-top: 16px; text-align: left;';
          consentDiv.innerHTML = legend.innerHTML;
          container.insertBefore(consentDiv, insertNode);
        }
        
        // Custom Submit Handler
        document.getElementById('custom-submit-btn').addEventListener('click', (e) => {
          e.preventDefault();
          let isValid = true;
          const customData = {};
          
          additionalFields.forEach((field) => {
            const el = document.getElementById(`custom-${field.name}`);
            if (!el) return;
            const val = el.value.trim();
            customData[field.name] = val;
            
            let err = el.parentNode.querySelector('.custom-field-error');
            if (field.required && !val) {
              isValid = false;
              el.style.borderColor = '#d0021b';
              if (!err) {
                err = document.createElement('div');
                err.className = 'custom-field-error';
                err.style.cssText = 'color:#d0021b; font-size:12px; margin-top:4px; text-align: left;';
                err.textContent = 'This field is required.';
                el.after(err);
              }
            } else {
              el.style.borderColor = '#6e6e6e';
              if (err) err.remove();
            }
          });
          
          if (!isValid) return;
          
          form.addHiddenFields(customData);
          const realSubmit = formEl.querySelector('.mktoButton');
          if (realSubmit) realSubmit.click();
        });
        
      }, 500);
      
    } catch (e) {
      window.lana?.log(`Failed to parse additional-fields JSON: ${e.message}`, { tags: 'marketo', severity: 'w' });
    }
  }

  const isDesktop = matchMedia('(min-width: 900px)');
  el.classList.remove('loading');
  formEl.style.opacity = '';
  formEl.style.visibility = '';
  formEl.style.setProperty('width', '100%', 'important');
  formEl.classList.add('mktoForm--fade-in', 'mktoVisible');

  // Strip initial widths defensively
  formEl.querySelectorAll('[style*="width"]').forEach((element) => {
    element.style.width = '';
  });

  const handleIframeReady = (event) => {
    if (event.origin !== 'https://engage.adobe.com') return;
    const message = JSON.parse(event.data);
    if (!message.mktoReady) return;
    const hadFailed = el.dataset.mktoFailed === 'true';
    setDataLayer(FORM_XDFRAME, 'ready');
    const formVisible = isVisible(formEl);
    if (hadFailed && formVisible) {
      window.lana?.log(LANA_MESSAGE.RENDER_RECOVERED, { tags: 'marketo', severity: 'i', sampleRate: 100 });
      delete el.dataset.mktoFailed;
      el.querySelector('.marketo-overlay')?.remove();
      formEl.inert = false;
    }
    window.removeEventListener('message', handleIframeReady);
  };
  window.addEventListener('message', handleIframeReady);
  formTimeout(el, () => getDataLayer(FORM_XDFRAME) !== 'ready', LANA_MESSAGE.HANDSHAKE_FAILED);

  formEl.addEventListener('focus', ({ target }) => {
    const hasError = formEl.classList.contains('show-warnings');
    const firstInvalidField = formEl.querySelector('.mktoRequired[aria-invalid=true]');
    if (!['text', 'email', 'tel', 'textarea'].includes(target.type)
      || (isDesktop.matches && !(hasError && target === firstInvalidField))) return;

    const pageTop = document.querySelector('header')?.offsetHeight ?? 0;
    const targetPosition = target?.getBoundingClientRect().top ?? 0;
    const offsetPosition = targetPosition + window.pageYOffset - pageTop - window.innerHeight / 2;
    window.scrollTo(0, offsetPosition);
  }, true);

  form.onValidate((valid) => {
    formValidate(formEl);
    if (valid) form.submittable(true);
  });

  form.onSubmit(() => {
    formSubmit(formEl);
  });

  form.onSuccess(() => formSuccess(formEl, formData));
};
export const loadMarketo = (el, formData) => {
  console.log("Marketo Data", formData, el)
  setDataLayer(FORM_STATUS, 'loading');
  const baseURL = formData[BASE_URL];
  const munchkinID = formData[MUNCHKIN_ID];
  const formID = formData[FORM_ID];

  const loaderUrl = new URL('../../scripts/marketo-form-loader.js', import.meta.url).href;
  return loadScript(loaderUrl)
    .then(() => {
      if (typeof window.loadMarketoForm !== 'function') {
        throw new Error('marketo-form-loader.js did not expose loadMarketoForm');
      }

      const programId = parseInt(formData['program id'] || formData['program.id'] || formID, 10);

      const config = {
        form_config: {
          form_id_base: parseInt(formID, 10),
          form_id_program: programId,
          success: {
            type: formData[SUCCESS_TYPE] || "redirect",
            content: formData[SUCCESS_CONTENT] || "",
          },
        },
        demo_ux: {
          snippetDestination: null,
          formDestinationElement: ".marketo-form-wrapper",
          loadCss: formData['loadCss'] !== 'false',
          formCss: formData['formCss'] || formData['form css'] || "https://business.adobe.com/libs/blocks/marketo/marketo.css",
        },
        form_architecture: {
          previewMode: window.location.search.includes('preview='),
          stage: baseURL ? (baseURL.includes('stage') || baseURL.includes('developer-stage')) : false,
          munchkinId: munchkinID,
          instanceDomain: baseURL,
          mktoFormJS: baseURL ? `https://${baseURL}/js/forms2/js/forms2.min.js` : '',
        },
      };

      if (formData._dynamicConfig) {
        Object.entries(formData._dynamicConfig).forEach(([key, value]) => {
          if (key === 'custom-css') return;
          if (key === 'form-data') return;

          const parsedValue = parseJSONStr(value);

          if (key === 'demo_ux') {
            Object.assign(config.demo_ux, parsedValue);
          } else if (key === 'form_architecture') {
            Object.assign(config.form_architecture, parsedValue);
            if (config.form_architecture.mktoFormJS && config.form_architecture.mktoFormJS.startsWith('/')) {
              config.form_architecture.mktoFormJS = `https://${config.form_architecture.instanceDomain || baseURL}${config.form_architecture.mktoFormJS}`;
            }
          } else if (key === 'success') {
            Object.assign(config.form_config.success, parsedValue);
          } else {
            config.form_config[key] = parsedValue;
          }
        });
      }

      return window.loadMarketoForm(config).then((form) => {
        setDataLayer(FORM_STATUS, 'loaded');

        if (formData['custom-css']) {
          const style = document.createElement('style');
          const formEl = form.getFormElem().get(0);
          style.textContent = formData['custom-css'].replace(/#mktoForm_\d+/g, `#${formEl.id}`);
          document.head.appendChild(style);
        }

        readyForm(form, formData);

        /* c8 ignore next 3 */
        if (el.classList.contains('multi-step')) {
          import('./marketo-multi.js').then(({ default: multiStep }) => multiStep(el));
        }
      });
    })
    .catch((error) => {
      /* c8 ignore next 2 */
      el.style.display = 'none';
      console.error('Marketo form failed to load:', error);
      logFailure(el, LANA_MESSAGE.MARKETO_FORMS_JS);
      window.lana?.log(`Marketo form error: ${error.message}`, { tags: 'marketo', severity: 'e' });
    });
};

function decorateForm(el, formData) {
  const formID = formData[FORM_ID];
  const fragment = new DocumentFragment();
  const formWrapper = createTag('section', { class: 'marketo-form-wrapper' });

  if (formData.title) {
    const title = createTag('h3', { class: 'marketo-title' }, formData.title);
    formWrapper.append(title);
  }

  if (formData.description) {
    const description = createTag('p', { class: 'marketo-description' }, formData.description);
    formWrapper.append(description);
  }

  const marketoForm = createTag('form', { id: `mktoForm_${formID}`, class: 'hide-errors' });
  const span1 = createTag('span', { id: 'mktoForms2BaseStyle', style: 'display:none;' });
  const span2 = createTag('span', { id: 'mktoForms2ThemeStyle', style: 'display:none;' });
  formWrapper.append(span1, span2, marketoForm);

  fragment.append(formWrapper);
  el.replaceChildren(fragment);
  el.classList.add('loading');

  const stepPreferences = formData['form.fldStepPref'] || {};
  const count = Object.values(stepPreferences).findLastIndex((fields) => fields?.length) + 1 || 1;

  /* c8 ignore next 6 */
  if (count > 1) {
    el.classList.add(`multi-${count}`);
  }
  if (el.classList.contains('multi-2') || el.classList.contains('multi-3')) {
    el.classList.add('multi-step');
  }
}

export default async function init(el) {
  sessionStorage.removeItem('mktoPreFillFields');
  setDataLayer(FORM_STATUS, 'init');
  const children = Array.from(el.querySelectorAll(':scope > div'));
  let formData = {};

  // Check if the first row is an encoded config link
  const firstRow = children[0];
  const link = firstRow?.querySelector('a');
  if (link?.href && link.href.includes('#')) {
    children.shift(); // Remove the config row from children
    const encodedConfig = link.href.split('#')[1];
    formData = parseEncodedConfig(encodedConfig) || {};
  }

  children.forEach((element) => {
    const key = element.children[0]?.textContent.trim().toLowerCase().replaceAll(' ', '-');
    const value = element.children[1]?.href ?? element.children[1]?.textContent;
    if (!key || !value) return;
    if (key in FORM_MAP) {
      formData[FORM_MAP[key]] = value;
    } else {
      formData[key] = value;
    }
  });

  let formDataUrl = formData['form-data'];
  if (formDataUrl) {
    if (!formDataUrl.endsWith('.json') && !formDataUrl.startsWith('http') && !formDataUrl.startsWith('/')) {
      formDataUrl = `/test/petheanraj/marketo-form/${formDataUrl}.json`;
    }

    try {
      const resp = await fetch(formDataUrl);
      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          formData._dynamicConfig = {};
          json.data.forEach((row) => {
            const rowKey = row['form-data'] || row.key || row.name;
            const rowValue = row.value;
            if (rowKey && rowValue !== undefined) {
              const k = rowKey.toLowerCase().replaceAll(' ', '-');
              if (k in FORM_MAP) {
                formData[FORM_MAP[k]] = rowValue;
              } else {
                formData[k] = rowValue;
              }
              formData._dynamicConfig[rowKey] = rowValue;
            }
          });
        }
      }
    } catch (e) {
      window.lana?.log(`Failed to fetch marketo form data: ${e.message}`, { tags: 'marketo', severity: 'e' });
    }
  }

  if (formData.success) {
    try {
      const parsedSuccess = JSON.parse(formData.success);
      if (parsedSuccess.type) formData[SUCCESS_TYPE] = parsedSuccess.type;
      if (parsedSuccess.content) formData[SUCCESS_CONTENT] = parsedSuccess.content;
    } catch (e) {
      // Ignore invalid JSON
    }
  }

  let formID = formData[FORM_ID] || formData._dynamicConfig?.['form_id_base'];
  let baseURL = formData[BASE_URL];
  let munchkinID = formData[MUNCHKIN_ID];

  if (formData._dynamicConfig?.['form_architecture']) {
    const arch = parseJSONStr(formData._dynamicConfig['form_architecture']);
    if (arch.instanceDomain) baseURL = baseURL || arch.instanceDomain;
    if (arch.munchkinId) munchkinID = munchkinID || arch.munchkinId;
  }

  /* c8 ignore next 4 */
  if (!formID || !baseURL || !munchkinID) {
    const errorMsg = 'Marketo block is missing required fields (form id, marketo host, marketo munckin). Please add the missing fields in Milo or the dynamic JSON.';
    window.lana?.log(errorMsg, { tags: 'marketo', severity: 'e' });
    el.innerHTML = `<p class="marketo-error" style="color: red; padding: 20px; border: 1px solid red; margin: 20px 0; font-weight: bold;">${errorMsg}</p>`;
    return;
  }

  // Update formData so subsequent functions use the dynamically resolved values
  formData[FORM_ID] = formID;
  formData[BASE_URL] = baseURL;
  formData[MUNCHKIN_ID] = munchkinID;

  const searchParams = new URLSearchParams(window.location.search);
  const ungated = searchParams.get(FORM_PARAM) === 'off';

  if (formData[SUCCESS_TYPE] === 'section' && ungated) {
    el.classList.add('hide-block');
    toggleSuccessSection(formData);
    return;
  }

  const imsSuccessType = getMetadata('marketo-ims');

  if (imsSuccessType) {
    formData[SUCCESS_TYPE] = 'ims';
  }

  formData[SUCCESS_TYPE] = formData[SUCCESS_TYPE] || 'redirect';

  if (formData[SUCCESS_TYPE] === 'redirect') {
    const destinationUrl = await decorateURL(formData[SUCCESS_CONTENT]);

    if (destinationUrl) formData[SUCCESS_CONTENT] = destinationUrl;
  }

  formData[FORM_STATUS] = 'decorated';
  setDataLayerObj(formData);
  decorateForm(el, formData);

  loadLink(`https://${baseURL}`, { rel: 'dns-prefetch' });

  createIntersectionObserver({
    el,
    callback: (target) => {
      loadMarketo(target, formData);
    },
    options: { rootMargin: `${ROOT_MARGIN}px` },
  });
}