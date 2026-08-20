export default async function decorate(block) {
    let configData = {
        marketoConfig: {
            form_config: {},
            demo_ux: {},
            form_architecture: {},
        },
        customFields: [],
        submitButton: null,
        successRedirect: null
    };

    let fetchUrl = "/test/petheanraj/marketo-form/sales.json";
    const configLink = block.querySelector('a[href$=".json"]');
    if (configLink) {
        try {
            fetchUrl = new URL(configLink.href).pathname;
        } catch (e) {
            fetchUrl = configLink.getAttribute('href');
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

                if (configData.marketoConfig.form_config.success && configData.marketoConfig.form_config.success.type === 'redirect') {
                    configData.successRedirect = configData.marketoConfig.form_config.success.content;
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
                    fieldDiv.style.cssText = field.wrapperCss || 'margin: 8px 0;';

                    let html = '';
                    if (field.label) {
                        const labelCss = field.labelCss || 'display:block;font-size:14px;font-weight:700;margin-bottom:4px;';
                        html += `<label style="${labelCss}">${field.label} ${field.required ? '<span style="color:#d0021b;">*</span>' : ''}</label>`;
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

                // Custom submit button
                if (configData.submitButton) {
                    const submitDiv = document.createElement('div');
                    if (configData.submitButton.wrapperCss) submitDiv.style.cssText = configData.submitButton.wrapperCss;
                    submitDiv.innerHTML = `<button id="custom-submit" style="${configData.submitButton.buttonCss || ''}">${configData.submitButton.text || 'Submit'}</button>`;
                    container.insertBefore(submitDiv, after);
                }

                // Consent text
                const consentDiv = document.createElement('div');
                consentDiv.style.cssText = 'font-size:12px; color:#444; line-height:1.5;';
                if (legend) consentDiv.innerHTML = legend.innerHTML;
                container.insertBefore(consentDiv, after);

                const customSubmitBtn = document.getElementById('custom-submit');
                if (customSubmitBtn) {
                    customSubmitBtn.addEventListener('click', (e) => {
                        e.preventDefault();

                        let allValid = true;
                        const hiddenFields = {};

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
                                    err.style.cssText = field.errorCss || 'color:#d0021b; font-size:12px; margin-top:4px;';
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
            let customValid = true;
            let firstInvalid = null;

            (configData.customFields || []).forEach(field => {
                const inputEl = document.getElementById(field.id);
                if (field.required && inputEl && !inputEl.value.trim()) {
                    customValid = false;
                    if (!firstInvalid) firstInvalid = inputEl;
                }
            });

            if (valid && customValid) {
                form.submittable(true);
            } else {
                form.submittable(false);
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        });

        form.onSuccess(function () {
            if (configData.successRedirect) {
                top.location.href = configData.successRedirect;
                return false;
            }
        });

    }).catch((error) => {
        console.error("Failed to load Marketo form:", error);
    });
}

