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

  let fetchUrl = window.location.pathname;

  if (authoredConfig['form-data']) {
    if (fetchUrl.endsWith('/')) {
      fetchUrl = `${window.location.pathname}${authoredConfig['form-data']}.json`;
    } else {
      fetchUrl = `${window.location.pathname}/${authoredConfig['form-data']}.json`;
    }
  }

  try {
    const resp = await fetch(fetchUrl);
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.data) {
        const blockConfig = {};
        json.data.forEach(row => {
          const key = row['form-data'] || row['Key'] || row['key'];
          const value = row['value'] || row['Value'];
          if (key) {
            blockConfig[key] = value;
          }
        });

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

        if (blockConfig['form_id_base']) configData.marketoConfig.form_config.form_id_base = parseInt(blockConfig['form_id_base'], 10);
        if (blockConfig['form_id_program']) configData.marketoConfig.form_config.form_id_program = parseInt(blockConfig['form_id_program'], 10);
        if (blockConfig['poi']) configData.marketoConfig.form_config.poi = blockConfig['poi'];
        if (blockConfig['campaignIds']) configData.marketoConfig.form_config.campaignIds = safeParse(blockConfig['campaignIds'], {});
        if (blockConfig['copartnernames'] !== undefined) configData.marketoConfig.form_config.copartnernames = blockConfig['copartnernames'];
        if (blockConfig['success']) configData.marketoConfig.form_config.success = safeParse(blockConfig['success'], {});
        if (blockConfig['templateOverrides']) configData.marketoConfig.form_config.templateOverrides = safeParse(blockConfig['templateOverrides'], {});
        if (blockConfig['prefillFields']) configData.marketoConfig.form_config.prefillFields = safeParse(blockConfig['prefillFields'], {});

        if (blockConfig['demo_ux']) configData.marketoConfig.demo_ux = safeParse(blockConfig['demo_ux'], {});
        if (blockConfig['form_architecture']) configData.marketoConfig.form_architecture = safeParse(blockConfig['form_architecture'], {});

        if (blockConfig['additional-fields']) {
          configData.customFields = safeParse(blockConfig['additional-fields'], []);
        }

        if (blockConfig['submitButton']) {
          configData.submitButton = safeParse(blockConfig['submitButton'], null);
        }

        if (blockConfig['consentPosition']) {
          configData.consentPosition = blockConfig['consentPosition'];
        }

        const successConfig = configData.marketoConfig.form_config.success;
        console.log("Parsed successConfig:", successConfig);
        if (successConfig) {
          if (successConfig.type === 'redirect') {
            configData.successRedirect = successConfig.content;
          } else if (successConfig.type === 'message') {
            configData.successMessage = successConfig.content;
          }
          console.log("Set configData.successMessage to:", configData.successMessage);
        }

        if (blockConfig['custom-css']) {
          const style = document.createElement('style');
          style.innerHTML = blockConfig['custom-css'];
          document.head.append(style);
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch marketo config from:", fetchUrl, err);
  }

  // Clear the block's default HTML table so it doesn't render on the screen
  block.innerHTML = '';

  // Create the wrapper for the Marketo form
  const wrapper = document.createElement('section');
  wrapper.className = 'marketo-form-wrapper';
  block.append(wrapper);

  function getEnvironment() {
    const host = window.location.host;
    if (host.indexOf('local') >= 0 || host.indexOf('developer-stage') >= 0) {
      return 'stage';
    } else if (host.indexOf('developer.adobe.com') >= 0) {
      return 'prod';
    }
  }

  const env = getEnvironment();

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

      const selectColorStyle = document.createElement('style');
      selectColorStyle.textContent = `
                form.mktoForm .mktoFormRow.mktoCleanedScript,
                form.mktoForm .mktoHtmlText span {
                    display: none !important;
                }
            `;
      document.head.appendChild(selectColorStyle);
      document.addEventListener('change', (e) => {
        if (e.target.tagName !== 'SELECT' || !formEl.contains(e.target)) return;
        const name = e.target.name;
        const color = e.target.value ? '#2c2c2c' : '#959595';
        const existing = selectColorStyle.textContent;
        const formId = formEl.id || 'mktoForm';
        const rule = `#${formId} select[name="${name}"] { color: ${color} !important; }`;
        const replaced = existing.replace(new RegExp(`#${formId} select\\[name="${name}"\\][^}]+}`, 'g'), '');
        selectColorStyle.textContent = replaced + rule;
      }, true);
      // Timeout needed to wait for MCZ to render the consent row legend
      setTimeout(() => {
        const consentRow = formEl.querySelector('.mktoFormRow.by-supplyingmycontac');
        if (consentRow) consentRow.style.setProperty('display', 'none', 'important');
        const legend = consentRow && consentRow.querySelector('legend');

        const container = formEl.parentNode;
        const after = formEl.nextSibling;

        const customInputs = [];

        (configData.customFields || []).forEach((field, index) => {
          const id = field.id || field.name || `custom-field-${index}`;
          field.id = id;

          const fieldDiv = document.createElement('div');
          fieldDiv.className = 'aem-injected-element';
          fieldDiv.style.cssText = field.wrapperCss || 'margin: 8px 0;';

          let html = '';
          if (field.label) {
            const labelCss = field.labelCss || 'display:block;font-size:14px;font-weight:700;margin-bottom:4px;';
            html += `<label style="${labelCss}">${field.label} ${field.required ? '*' : ''}</label>`;
          }

          const inputCss = field.inputCss || 'width:100%;box-sizing:border-box;font-size:16px;padding:8px;border:1px solid #6e6e6e;border-radius:4px;';
          if (field.type === 'textarea') {
            html += `<textarea id="${id}" rows="6" style="${inputCss}" placeholder="${field.placeholder || ''}"></textarea>`;
          } else {
            html += `<input type="${field.type || 'text'}" id="${id}" style="${inputCss}" placeholder="${field.placeholder || ''}" />`;
          }
          fieldDiv.innerHTML = html;
          container.insertBefore(fieldDiv, after);
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
        // This interval ensures any wrapper containing a hidden field is also strictly display: none.
        setInterval(() => {
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
        }, 500);

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

            // Validate all Marketo required fields
            formEl.querySelectorAll('.mktoRequired').forEach(field => {
              // Skip hidden fields (Marketo sometimes hides fields dynamically)
              if (field.offsetWidth === 0 && field.offsetHeight === 0) {
                // If Marketo still requires them, we must fill them with dummy data
                // otherwise Marketo's built-in validation will fail silently.
                if (!field.value.trim()) {
                  if (field.type === 'email' || field.name === 'Email') {
                    field.value = 'dummy@example.com';
                  } else if (field.name === 'Country') {
                    field.value = 'US';
                  } else if (field.tagName === 'SELECT' && field.options.length > 1) {
                    field.value = field.options[1].value;
                  } else {
                    field.value = 'dummy';
                  }
                }
                return;
              }

              if (!field.value.trim()) {
                showFieldErr(field);
                allValid = false;
              } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
                showFieldErr(field, 'Must be a valid email address.');
                allValid = false;
              } else if (field.name === 'Phone' && !/^\+?[\d\s\-().]{7,20}$/.test(field.value.trim())) {
                showFieldErr(field, 'Please enter a valid phone number.');
                allValid = false;
              } else {
                clearFieldErr(field);
              }
            });

            customInputs.forEach(field => {
              const inputEl = document.getElementById(field.id);
              if (!inputEl) return;

              let isValid = true;
              if (field.required && !inputEl.value.trim()) {
                isValid = false;
                allValid = false;
              }

              if (!isValid) {
                inputEl.style.borderColor = '#d0021b';
                let err = document.getElementById(field.id + '-error');
                if (!err) {
                  err = document.createElement('div');
                  err.id = field.id + '-error';
                  err.className = 'custom-field-error';
                  err.style.cssText = field.errorCss || 'color:#d0021b !important; font-size:12px; margin-top:4px;';
                  err.textContent = field.errorText || 'This field is required.';
                  inputEl.after(err);
                }
              } else {
                inputEl.style.borderColor = '#6e6e6e';
                const err = document.getElementById(field.id + '-error');
                if (err) err.remove();

                const marketoName = field.name || field.marketoField;
                if (marketoName) {
                  hiddenFields[marketoName] = inputEl.value;
                }
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
      console.log("Marketo form onValidate triggered. valid:", valid);

      if (!valid) {
        console.log("Marketo built-in validation failed! The following Marketo fields are invalid:");
        const invalidEls = form.getFormElem()[0].querySelectorAll('.mktoInvalid');
        invalidEls.forEach(el => {
          console.log("- Field name:", el.name, "| id:", el.id, "| value:", el.value);
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

      console.log("customValid:", customValid);
      if (valid && customValid) {
        console.log("Form is submittable (valid & customValid true)");
        form.submittable(true);
      } else {
        console.log("Form is NOT submittable. valid:", valid, "customValid:", customValid);
        form.submittable(false);
        if (firstInvalid) {
          firstInvalid.focus();
        }
      }
    });

    form.onSubmit(function (form) {
      console.log("Marketo form onSubmit triggered! Validation passed, sending data...");
    });

    form.onSuccess(function () {
      console.log("Marketo form onSuccess triggered.");
      console.log("configData.successRedirect:", configData.successRedirect);

      if (configData.successRedirect) {
        top.location.href = configData.successRedirect;
        return false;
      }

      // Hide all custom injected elements (custom fields, submit button, consent)
      document.querySelectorAll('.aem-injected-element').forEach(el => el.style.display = 'none');

      console.log("Falling back to Marketo default success behavior.");
    });

  }).catch((error) => {
    console.error("Failed to load Marketo form:", error);
  });
}

