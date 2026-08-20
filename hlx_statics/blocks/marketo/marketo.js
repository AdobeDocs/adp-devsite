export default async function decorate(block) {
    let configData = {
        marketoConfig: {
            form_config: {
                form_id_base: 2277,
                form_id_program: 4061,
                poi: "Document Services",
                campaignIds: {
                    sfdc: "7015Y000003pFaCQAU",
                    external: "",
                    retouch: "",
                    onsite: "",
                    cgen: "",
                    cuid: "",
                },
                copartnernames: "",
                success: {
                    type: "message",
                    content: "",
                },
                templateOverrides: {
                    template: "",
                    purpose: ["request_for_information"],
                    known_visitor: false,
                    auto_success: false,
                    create_inquiry: true,
                    field_visibility: {
                        name: "required",
                        phone: "required",
                        company: "required",
                        website: "required",
                        state: "visible",
                        postcode: "visible",
                        company_size: "required",
                        demo: "hidden",
                        comments: "hidden",
                    },
                    field_filters: {
                        functional_area: "all",
                        products: "hidden",
                        industry: "all",
                        job_role: "all",
                    }
                },
                prefillFields: {
                    pmProductionCampaignId: "7015Y000003pFaCQAU",
                    pmOnsiteCampaignId: "",
                    pmRetouchCampaignId: "",
                    pmExternalCampaignId: "",
                    cGenTagId: "",
                    productofInterest: "Document Services",
                    mktoConsentNotice: "",
                },
            },
            demo_ux: {
                snippetDestination: null,
                formDestinationElement: ".marketo-form-wrapper",
                loadCss: false,
            },
            form_architecture: {
                previewMode: false,
                stage: false,
                munchkinId: "360-KCI-804",
                instanceDomain: "engage.adobe.com",
                mktoFormJS: "https://engage.adobe.com/js/forms2/js/forms2.min.js",
                formSubmitPath: "/index.php/leadCapture/save2",
                stageSettings: {
                    munchkinId: "371-GBU-660",
                    formId: 1212,
                    instanceDomain: "371-GBU-660.mktoweb.com",
                    formCss: "https://business.adobe.com/libs/blocks/marketo/marketo.css",
                },
            },
        },
        customFields: [
            {
                id: "custom-use-case",
                type: "textarea",
                label: "Use case",
                required: true,
                placeholder: "Please describe your intended application of our PDF Services APIs.",
                wrapperCss: "margin: 8px 0;",
                labelCss: "display:block;font-size:14px;font-weight:700;margin-bottom:4px;",
                inputCss: "width:100%;box-sizing:border-box;font-size:16px;padding:8px;border:1px solid #6e6e6e;border-radius:4px;",
                errorText: "This field is required.",
                errorCss: "color:#d0021b; font-size:12px; margin-top:4px;",
                marketoField: "mktoQuestionComments"
            }
        ],
        submitButton: {
            text: "Submit",
            wrapperCss: "text-align:center; margin: 16px 0;",
            buttonCss: "background-color:#1473e6;color:#fff;border:none;border-radius:16px;font-size:15px;font-weight:700;padding:8px 24px;cursor:pointer;"
        },
        successRedirect: "/document-services/pricing/contact/sales/confirmation"
    };

    function deepMerge(target, source) {
        if (typeof target !== 'object' || target === null) return source;
        if (typeof source !== 'object' || source === null) return target;
        if (Array.isArray(source)) return source;
        
        const output = Object.assign({}, target);
        Object.keys(source).forEach(key => {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                if (key in target) {
                    output[key] = deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            } else {
                output[key] = source[key];
            }
        });
        return output;
    }

    const rawJsonText = block.textContent.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    if (rawJsonText && rawJsonText.startsWith('{') && rawJsonText.endsWith('}')) {
        try {
            const parsedConfig = JSON.parse(rawJsonText);
            configData = deepMerge(configData, parsedConfig);
        } catch (e) {
            console.error("Failed to parse marketo block JSON config:", e);
        }
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
                
                (configData.customFields || []).forEach(field => {
                    const fieldDiv = document.createElement('div');
                    if (field.wrapperCss) fieldDiv.style.cssText = field.wrapperCss;
                    
                    let html = '';
                    if (field.label) {
                        html += `<label style="${field.labelCss || ''}">${field.label} ${field.required ? '<span style="color:#d0021b;">*</span>' : ''}</label>`;
                    }
                    
                    if (field.type === 'textarea') {
                        html += `<textarea id="${field.id}" rows="6" style="${field.inputCss || ''}" placeholder="${field.placeholder || ''}"></textarea>`;
                    } else {
                        html += `<input type="${field.type || 'text'}" id="${field.id}" style="${field.inputCss || ''}" placeholder="${field.placeholder || ''}" />`;
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
                                
                                if (field.marketoField) {
                                    hiddenFields[field.marketoField] = inputEl.value;
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

