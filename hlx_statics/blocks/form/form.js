function createSelect(fd) {
  const select = document.createElement('select');
  select.id = fd.Field;
  if (fd.Placeholder) {
    const ph = document.createElement('option');
    ph.textContent = fd.Placeholder;
    ph.setAttribute('selected', '');
    ph.setAttribute('disabled', '');
    select.append(ph);
  }
  fd.Options.split(',').forEach((o) => {
    const option = document.createElement('option');
    option.textContent = o.trim();
    option.value = o.trim();
    select.append(option);
  });
  if (fd.Mandatory === 'x') {
    select.setAttribute('required', 'required');
  }
  return select;
}

function constructPayload(form) {
  const payload = {};
  [...form.elements].forEach((fe) => {
    if (fe.type === 'checkbox') {
      if (fe.checked) payload[fe.id] = fe.value;
    } else if (fe.id) {
      payload[fe.id] = fe.value;
    }
  });
  return payload;
}

async function submitForm(form) {
  const payload = constructPayload(form);
  payload.timestamp = new Date().toJSON();
  
  // eslint-disable-next-line no-console
  console.log('Submitting Form Data:', payload);

  let action = form.dataset.action;
  let body = JSON.stringify({ data: payload });

  const submitAction = form.dataset.submitAction;
  if (submitAction === 'faas_submission') {
    action = 'https://faas.adobe.com/api/v1/submit'; // Stub FaaS Endpoint
    body = JSON.stringify(payload);
  } else if (submitAction === 'Fetch POST to Adobe I/O Runtime (/api/v1/web/default/submit)') {
    action = 'https://adobeioruntime.net/api/v1/web/default/submit'; // Stub Runtime Endpoint
    body = JSON.stringify(payload);
  }

  const resp = await fetch(action, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
  await resp.text();
  return resp;
}

function createButton(fd) {
  const button = document.createElement('button');
  button.textContent = fd.Label;
  button.classList.add('button');
  if (fd.Type === 'submit') {
    button.addEventListener('click', async (event) => {
      const form = button.closest('form');
      if (form.checkValidity()) {
        event.preventDefault();
        button.setAttribute('disabled', '');
        const messageEl = form.querySelector('.form-message');
        try {
          await submitForm(form);
          const destination = form.dataset.destinationUrl;
          if (destination && !destination.toLowerCase().includes('alert')) {
            window.location.href = destination;
          } else {
            messageEl.textContent = fd.Extra || 'Thank you for your submission.';
            messageEl.className = 'form-message success';
            form.reset();
          }
        } catch (e) {
          messageEl.textContent = 'Something went wrong. Please try again.';
          messageEl.className = 'form-message error';
        } finally {
          button.removeAttribute('disabled');
        }
      }
    });
  }
  return button;
}

function createHeading(fd) {
  const heading = document.createElement('h3');
  heading.textContent = fd.Label;
  return heading;
}

function createInput(fd) {
  const input = document.createElement('input');
  input.type = fd.Type;
  input.id = fd.Field;
  if (fd.Placeholder) input.setAttribute('placeholder', fd.Placeholder);
  if (fd.Value) input.value = fd.Value;
  if (fd.Mandatory === 'x') {
    input.setAttribute('required', 'required');
  }
  return input;
}

function createTextArea(fd) {
  const input = document.createElement('textarea');
  input.id = fd.Field;
  input.setAttribute('placeholder', fd.Placeholder);
  if (fd.Mandatory === 'x') {
    input.setAttribute('required', 'required');
  }
  return input;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.setAttribute('for', fd.Field);
  label.textContent = fd.Label;
  if (fd.Mandatory === 'x') {
    label.classList.add('required');
  }
  return label;
}

function applyRules(form, rules) {
  const payload = constructPayload(form);
  rules.forEach((field) => {
    const { type, condition: { key, operator, value } } = field.rule;
    if (type === 'visible') {
      if (operator === 'eq') {
        if (payload[key] === value) {
          form.querySelector(`.${field.fieldId}`).classList.remove('hidden');
        } else {
          form.querySelector(`.${field.fieldId}`).classList.add('hidden');
        }
      }
    }
  });
}

function fill(form) {
  const rules = [];
  [...form.elements].forEach((fe) => {
    const { name, value } = fe;
    if (name && value && fe.type !== 'submit') {
      const payload = {};
      payload[name] = value;
      // You can add data filling logic here if URL parameters map to form fields
    }
  });
}

async function createForm(formURL) {
  const { pathname } = new URL(formURL);
  const resp = await fetch(pathname);
  const json = await resp.json();
  const form = document.createElement('form');
  form.dataset.action = pathname;
  const rules = [];

  const message = document.createElement('div');
  message.className = 'form-message';
  form.append(message);

  // eslint-disable-next-line prefer-destructuring
  json.data.forEach((fd) => {
    fd.Type = fd.Type || 'text';
    const type = fd.Type.toLowerCase();

    if (type === 'configuration') {
      const key = fd.Field.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      // convert to camelCase for dataset
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      form.dataset[camelKey] = fd.Value;
      return;
    }

    if (type === 'hidden') {
      form.append(createInput(fd));
      return;
    }

    const fieldWrapper = document.createElement('div');
    const style = fd.Style ? ` form-${fd.Style}` : '';
    const fieldId = `form-${fd.Type}-wrapper${style}`;
    fieldWrapper.className = fieldId;
    fieldWrapper.classList.add('field-wrapper');
    switch (fd.Type) {
      case 'select':
        fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(createSelect(fd));
        break;
      case 'heading':
        fieldWrapper.append(createHeading(fd));
        break;
      case 'checkbox':
        fieldWrapper.append(createInput(fd));
        fieldWrapper.append(createLabel(fd));
        break;
      case 'text-area':
        fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(createTextArea(fd));
        break;
      case 'submit':
        fieldWrapper.append(createButton(fd));
        break;
      default:
        fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(createInput(fd));
    }

    if (fd.Rules) {
      try {
        rules.push({ fieldId, rule: JSON.parse(fd.Rules) });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`Invalid Rule ${fd.Rules}: ${e}`);
      }
    }
    form.append(fieldWrapper);
  });

  form.addEventListener('change', () => applyRules(form, rules));
  applyRules(form, rules);
  fill(form);
  return (form);
}

export default async function decorate(block) {
  const form = block.querySelector('a[href$=".json"]');
  if (form) {
    form.replaceWith(await createForm(form.href));
  }
}
