import { readBlockConfig } from '../../scripts/lib-helix.js';

export default async function decorate(block) {
  const authoredConfig = readBlockConfig(block);
  let configData = {
    marketoConfig: {
      form_config: {},
      demo_ux: {},
      form_architecture: {},
    },
    customFields: [],
    submitButton: null,
    successRedirect: null,
    successMessage: null,
    consentPosition: 'after-button'
  };

  if (authoredConfig['form-data']) {
    const fetchUrl = `${window.location.pathname.replace(/\/$/, '')}/${authoredConfig['form-data']}.json`;

    try {
      const resp = await fetch(fetchUrl);
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.data) {
          const blockConfig = json.data.reduce((acc, row) => {
            const key = row['form-data'] || row['Key'] || row['key'];
            if (key) acc[key] = row['value'] || row['Value'];
            return acc;
          }, {});

          const safeParse = (str, fallback) => {
            if (!str) return fallback;
            try {
              const cleaned = str.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
              return JSON.parse(cleaned);
            } catch (e) {
              console.error("Failed to parse JSON for config:", str, e);
              return fallback;
            }
          };

          const fc = configData.marketoConfig.form_config;
          ['form_id_base', 'form_id_program'].forEach(k => { if (blockConfig[k]) fc[k] = parseInt(blockConfig[k], 10); });
          ['poi', 'copartnernames'].forEach(k => { if (blockConfig[k] !== undefined) fc[k] = blockConfig[k]; });
          ['campaignIds', 'success', 'templateOverrides', 'prefillFields'].forEach(k => { if (blockConfig[k]) fc[k] = safeParse(blockConfig[k], {}); });
          ['demo_ux', 'form_architecture'].forEach(k => { if (blockConfig[k]) configData.marketoConfig[k] = safeParse(blockConfig[k], {}); });

          if (blockConfig['additional-fields']) configData.customFields = safeParse(blockConfig['additional-fields'], []);
          if (blockConfig['submitButton']) configData.submitButton = safeParse(blockConfig['submitButton'], null);
          if (blockConfig['consentPosition']) configData.consentPosition = blockConfig['consentPosition'];

          const successConfig = configData.marketoConfig.form_config.success;
          if (successConfig) {
            configData[successConfig.type === 'redirect' ? 'successRedirect' : 'successMessage'] = successConfig.content;
          }

          if (blockConfig['custom-css']) {
            document.head.insertAdjacentHTML('beforeend', `<style>${blockConfig['custom-css']}</style>`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch marketo config from:", fetchUrl, err);
    }
  }

  // Clear the block's default HTML table so it doesn't render on the screen
  block.innerHTML = '';

  // Create the wrapper for the Marketo form
  const wrapper = document.createElement('section');
  wrapper.className = 'marketo-form-wrapper';
  block.append(wrapper);

  // Unused environment function removed for optimization

  // Clear Marketo's sessionStorage prefill so form starts fresh each load
  sessionStorage.removeItem('mktoPreFillFields');

  // Ensure marketo-form-loader.js is loaded
  if (typeof window.loadMarketoForm !== 'function') {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/hlx_statics/scripts/marketo-form-loader.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
    } catch (err) {
      console.error('Failed to load marketo-form-loader.js', err);
      return;
    }
  }

  loadMarketoForm(configData.marketoConfig).then((form) => {
    const faasHeader = document.querySelector(".faas-header");
    if (faasHeader) {
      faasHeader.style.display = "flex";
    }

    const formEl = form.getFormElem && form.getFormElem()[0];

    if (formEl) {
      formEl.setAttribute('autocomplete', 'off');

      // Clear Marketo cookie-prefilled fields using the proper API
      form.vals({
        FirstName: '', LastName: '', Email: '', Phone: '',
        mktoFormsCompany: '', Website: '', Country: '',
        State: '', PostalCode: '', mktoCompanySize: '',
        Industry: '', mktoFormsJobTitle: '', mktoFormsFunctionalArea: '',
      });

      // Inject everything outside the form to avoid Marketo's grid/style stripping

      formEl.addEventListener('change', (e) => {
        if (e.target.tagName === 'SELECT') {
          e.target.style.setProperty('color', e.target.value ? '#2c2c2c' : '#959595', 'important');
        }
      });
      // Timeout needed to wait for MCZ to render the consent row legend
      setTimeout(() => {
        const consentRow = formEl.querySelector('.mktoFormRow.by-supplyingmycontac');
        if (consentRow) consentRow.style.setProperty('display', 'none', 'important');
        const legend = consentRow && consentRow.querySelector('legend');

        const container = formEl.parentNode;
        const after = formEl.nextSibling;

        const customInputs = [];

        (configData.customFields || []).forEach((field, index) => {
          field.id = field.id || field.name || `custom-field-${index}`;
          const labelHtml = field.label ? `<label style="${field.labelCss || 'display:block;font-size:14px;font-weight:700;margin-bottom:4px;'}">${field.label} ${field.required ? '*' : ''}</label>` : '';
          const inputCss = field.inputCss || 'width:100%;box-sizing:border-box;font-size:16px;padding:8px;border:1px solid #6e6e6e;border-radius:4px;';
          const inputHtml = field.type === 'textarea' ? `<textarea id="${field.id}" rows="6" style="${inputCss}" placeholder="${field.placeholder || ''}"></textarea>` 
            : `<input type="${field.type || 'text'}" id="${field.id}" style="${inputCss}" placeholder="${field.placeholder || ''}" />`;
          
          container.insertBefore(Object.assign(document.createElement('div'), {
            className: 'aem-injected-element', style: field.wrapperCss || 'margin: 8px 0;', innerHTML: labelHtml + inputHtml
          }), after);
          customInputs.push(field);
        });

        // Setup Custom submit button
        let submitDiv = null;
        if (configData.submitButton) {
          submitDiv = document.createElement('div');
          submitDiv.className = 'aem-injected-element';
          if (configData.submitButton.wrapperCss) submitDiv.style.cssText = configData.submitButton.wrapperCss;
          submitDiv.innerHTML = `<button id="custom-submit" style="${configData.submitButton.buttonCss || ''}">${configData.submitButton.text || 'Submit'}</button>`;
        }

        // Setup Consent text
        const consentDiv = document.createElement('div');
        consentDiv.className = 'aem-injected-element';
        consentDiv.style.cssText = 'font-size:12px; color:#444; line-height:1.5; margin: 8px 0;';
        if (legend) consentDiv.innerHTML = legend.innerHTML;

        // Inject based on configured position
        if (configData.consentPosition === 'before-button') {
          container.insertBefore(consentDiv, after);
          if (submitDiv) container.insertBefore(submitDiv, after);
        } else {
          if (submitDiv) container.insertBefore(submitDiv, after);
          container.insertBefore(consentDiv, after);
        }

        // Aggressive cleanup: Marketo hides fields using various methods (visibility, opacity, display:none on rows).
        // Because we use display: contents on rows to enable CSS Grid, some wrappers might be left exposed.
        // We use a MutationObserver to ensure any wrapper containing a hidden field is also strictly display: none.
        const observer = new MutationObserver(() => {
          formEl.querySelectorAll('.mktoFieldWrap').forEach(wrap => {
            const input = wrap.querySelector('.mktoField');
            if (input) {
              const style = window.getComputedStyle(input);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || input.type === 'hidden') {
                wrap.style.setProperty('display', 'none', 'important');
              } else {
                // Only remove if we explicitly set it
                if (wrap.style.display === 'none') {
                  wrap.style.removeProperty('display');
                }
              }
            } else {
              // Wrapper has no input (e.g. just empty html text)
              const htmlText = wrap.querySelector('.mktoHtmlText');
              if (!htmlText || htmlText.innerHTML.trim() === '') {
                wrap.style.setProperty('display', 'none', 'important');
              }
            }
          });
        });
        observer.observe(formEl, { attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class'] });

        const customSubmitBtn = document.getElementById('custom-submit');

        function showFieldErr(field, msg) {
          const id = 'err-' + field.name;
          field.style.setProperty('border-color', '#d0021b', 'important');
          const existing = document.getElementById(id);
          if (existing) { existing.textContent = msg || 'This field is required.'; return; }
          const err = document.createElement('div');
          err.id = id;
          err.className = 'custom-field-error';
          err.style.cssText = 'color:#d0021b !important; font-size:12px; margin-top:4px; display:block; clear:both; width:100%;';
          err.textContent = msg || 'This field is required.';
          const wrap = field.closest('.mktoFieldWrap');
          if (wrap) {
            wrap.appendChild(err);
          } else {
            field.parentNode.appendChild(err);
          }
        }

        function clearFieldErr(field) {
          field.style.removeProperty('border-color');
          const err = document.getElementById('err-' + field.name);
          if (err) err.remove();
        }

        if (customSubmitBtn) {
          customSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();

            let allValid = true;
            const hiddenFields = {};

            formEl.querySelectorAll('.mktoRequired').forEach(field => {
              const val = field.value.trim(), isEmail = field.type === 'email' || field.name === 'Email';
              if (!field.offsetWidth && !field.offsetHeight) {
                if (!val) field.value = isEmail ? 'dummy@example.com' : field.name === 'Country' ? 'US' : field.tagName === 'SELECT' && field.options.length > 1 ? field.options[1].value : 'dummy';
                return;
              }
              if (!val) return allValid = false, showFieldErr(field);
              if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return allValid = false, showFieldErr(field, 'Must be a valid email address.');
              if (field.name === 'Phone' && !/^\+?[\d\s\-().]{7,20}$/.test(val)) return allValid = false, showFieldErr(field, 'Please enter a valid phone number.');
              clearFieldErr(field);
            });

            customInputs.forEach(field => {
              const inputEl = document.getElementById(field.id);
              if (!inputEl) return;
              if (field.required && !inputEl.value.trim()) {
                allValid = false;
                inputEl.style.borderColor = '#d0021b';
                if (!document.getElementById(`${field.id}-error`)) {
                  inputEl.insertAdjacentHTML('afterend', `<div id="${field.id}-error" class="custom-field-error" style="${field.errorCss || 'color:#d0021b !important; font-size:12px; margin-top:4px;'}">${field.errorText || 'This field is required.'}</div>`);
                }
              } else {
                inputEl.style.borderColor = '#6e6e6e';
                document.getElementById(`${field.id}-error`)?.remove();
                if (field.name || field.marketoField) hiddenFields[field.name || field.marketoField] = inputEl.value;
              }
            });

            if (allValid) {
              if (Object.keys(hiddenFields).length > 0) {
                form.addHiddenFields(hiddenFields);
              }
              formEl.querySelector('.mktoButton').click();
            }
          });
        }
      }, 500);
    }

    form.onValidate(function (valid) {
      if (!valid) {
        form.getFormElem()[0].querySelectorAll('.mktoInvalid').forEach(el => {
          console.warn("Invalid Marketo field:", el.name);
        });
      }

      let customValid = true;
      let firstInvalid = null;

      (configData.customFields || []).forEach(field => {
        const inputEl = document.getElementById(field.id);
        if (field.required && inputEl && !inputEl.value.trim()) {
          customValid = false;
          if (!firstInvalid) firstInvalid = inputEl;
        }
      });

      form.submittable(valid && customValid);
      if (!(valid && customValid) && firstInvalid) {
        firstInvalid.focus();
      }
    });

    form.onSubmit(function () {
      console.log("Marketo form onSubmit triggered! Validation passed, sending data...");
    });

    form.onSuccess(function () {
      if (configData.successRedirect) {
        return top.location.href = configData.successRedirect, false;
      }
      document.querySelectorAll('.aem-injected-element').forEach(el => el.style.display = 'none');
    });

  }).catch((error) => {
    console.error("Failed to load Marketo form:", error);
  });
}

