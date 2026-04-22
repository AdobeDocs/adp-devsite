const REPO = 'AdobeDocs/adp-devsite';
const WORKFLOW = 'qa-run.yml';
const RESULTS_FILE = 'tools/qa/results/latest.json';
const LS_KEY = 'qa-dashboard-settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function saveSettings(patch) {
  const s = { ...loadSettings(), ...patch };
  localStorage.setItem(LS_KEY, JSON.stringify(s));
  return s;
}

async function ghFetch(path, token, opts = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
}

async function triggerRun(token, branch, inputs) {
  const res = await ghFetch(
    `/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: branch, inputs }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function pollRun(token, branch, startedAfter, onProgress) {
  const deadline = Date.now() + 35 * 60 * 1000;
  await new Promise((r) => setTimeout(r, 8000));
  while (Date.now() < deadline) {
    const res = await ghFetch(
      `/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(branch)}&per_page=5`,
      token,
    );
    if (res.ok) {
      const { workflow_runs: runs } = await res.json();
      const run = (runs || []).find((r) => new Date(r.created_at) >= startedAfter);
      if (run) {
        onProgress(run);
        if (run.status === 'completed') return run;
      } else {
        onProgress(null);
      }
    }
    await new Promise((r) => setTimeout(r, 12000));
  }
  throw new Error('Timed out (35 min) waiting for workflow to complete');
}

async function loadResults(token, branch) {
  const res = await ghFetch(
    `/repos/${REPO}/contents/${RESULTS_FILE}?ref=${encodeURIComponent(branch)}&_=${Date.now()}`,
    token,
  );
  if (!res.ok) return null;
  const { content } = await res.json();
  return JSON.parse(atob(content.replace(/\n/g, '')));
}

const SUITE_LABELS = {
  visual: 'Visual Diff',
  links: 'Broken Links',
  nav: 'Nav Links',
  images: 'Missing Images',
  content: 'Content QA',
};

function renderResults(container, results) {
  container.innerHTML = '';

  if (!results || !results.timestamp) {
    const p = document.createElement('p');
    p.className = 'qa-dashboard__empty';
    p.textContent = results?.message || 'No results yet.';
    container.append(p);
    return;
  }

  const ts = new Date(results.timestamp).toLocaleString();
  const passed = results.status === 'passed';

  const header = document.createElement('div');
  header.className = 'qa-dashboard__results-header';
  const meta = document.createElement('span');
  meta.className = 'qa-dashboard__results-meta';
  meta.textContent = `${ts} · ${results.path_prefix} · ${results.suite}`;
  const badge = document.createElement('span');
  badge.className = `qa-dashboard__badge ${passed ? 'qa-dashboard__badge--pass' : 'qa-dashboard__badge--fail'}`;
  badge.textContent = passed ? '✓ All Passed' : '✗ Issues Found';
  header.append(meta, badge);
  container.append(header);

  const cards = document.createElement('div');
  cards.className = 'qa-dashboard__cards';

  for (const [key, label] of Object.entries(SUITE_LABELS)) {
    const s = results.suites?.[key];
    if (!s || (s.passed === 0 && s.failed === 0 && s.skipped === 0)) continue;
    const ok = s.failed === 0;
    const card = document.createElement('div');
    card.className = `qa-dashboard__card ${ok ? 'qa-dashboard__card--pass' : 'qa-dashboard__card--fail'}`;
    const count = s.failed > 0 ? `${s.failed} issue${s.failed !== 1 ? 's' : ''}` : `${s.passed} passed`;
    card.innerHTML = `
      <div class="qa-dashboard__card-label">${label}</div>
      <div class="qa-dashboard__card-count">${count}</div>
      <div class="qa-dashboard__card-sub">${s.passed} passed · ${s.failed} failed</div>
    `;
    cards.append(card);
  }
  container.append(cards);

  const allIssues = Object.entries(results.suites || {})
    .flatMap(([key, s]) => (s.issues || []).map((text) => ({ key, text })));

  if (allIssues.length) {
    const section = document.createElement('div');
    section.className = 'qa-dashboard__issues';
    const h = document.createElement('h3');
    h.className = 'qa-dashboard__issues-heading';
    h.textContent = `Issues (${allIssues.length})`;
    section.append(h);
    const ul = document.createElement('ul');
    ul.className = 'qa-dashboard__issues-list';
    for (const { key, text } of allIssues) {
      const li = document.createElement('li');
      li.className = 'qa-dashboard__issue-item';
      const suite = document.createElement('span');
      suite.className = 'qa-dashboard__issue-suite';
      suite.textContent = key;
      const msg = document.createElement('span');
      msg.className = 'qa-dashboard__issue-text';
      msg.textContent = text;
      li.append(suite, msg);
      ul.append(li);
    }
    section.append(ul);
    container.append(section);
  }
}

export default async function decorate(block) {
  block.textContent = '';
  block.classList.add('block', 'qa-dashboard');

  const settings = loadSettings();

  const heading = document.createElement('h2');
  heading.className = 'qa-dashboard__heading';
  heading.textContent = 'QA Dashboard — Prod vs Stage';
  block.append(heading);

  // --- Settings (collapsed once saved) ---
  const settingsDetails = document.createElement('details');
  settingsDetails.className = 'qa-dashboard__settings';
  settingsDetails.open = !settings.token;

  const settingsSummary = document.createElement('summary');
  settingsSummary.className = 'qa-dashboard__settings-summary';
  settingsSummary.textContent = 'GitHub Settings';
  settingsDetails.append(settingsSummary);

  const settingsBody = document.createElement('div');
  settingsBody.className = 'qa-dashboard__settings-body';

  const hint = document.createElement('p');
  hint.className = 'qa-dashboard__settings-hint';
  hint.textContent = 'Requires a GitHub PAT with repo and workflow scopes. Saved to localStorage.';
  settingsBody.append(hint);

  const patLabel = document.createElement('label');
  patLabel.className = 'qa-dashboard__field';
  patLabel.innerHTML = '<span class="qa-dashboard__label-text">GitHub Token (PAT)</span>';
  const patInput = document.createElement('input');
  patInput.type = 'password';
  patInput.className = 'qa-dashboard__input';
  patInput.placeholder = 'ghp_…';
  patInput.value = settings.token || '';
  patLabel.append(patInput);

  const branchLabel = document.createElement('label');
  branchLabel.className = 'qa-dashboard__field';
  branchLabel.innerHTML = '<span class="qa-dashboard__label-text">Branch</span>';
  const branchInput = document.createElement('input');
  branchInput.type = 'text';
  branchInput.className = 'qa-dashboard__input';
  branchInput.placeholder = 'devsite-2359';
  branchInput.value = settings.branch || '';
  branchLabel.append(branchInput);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'qa-dashboard__btn qa-dashboard__btn--secondary';
  saveBtn.textContent = 'Save Settings';
  saveBtn.addEventListener('click', () => {
    saveSettings({ token: patInput.value.trim(), branch: branchInput.value.trim() });
    settingsDetails.open = false;
  });

  settingsBody.append(patLabel, branchLabel, saveBtn);
  settingsDetails.append(settingsBody);
  block.append(settingsDetails);

  // --- Run config ---
  const runSection = document.createElement('div');
  runSection.className = 'qa-dashboard__run-section';

  const prefixLabel = document.createElement('label');
  prefixLabel.className = 'qa-dashboard__field';
  prefixLabel.innerHTML = '<span class="qa-dashboard__label-text">Path Prefix</span>';
  const prefixInput = document.createElement('input');
  prefixInput.type = 'text';
  prefixInput.className = 'qa-dashboard__input';
  prefixInput.placeholder = '/experience-cloud/cloud-manager';
  prefixInput.value = settings.lastPrefix || '';
  prefixLabel.append(prefixInput);

  const configRow = document.createElement('div');
  configRow.className = 'qa-dashboard__config-row';

  const suiteLabel = document.createElement('label');
  suiteLabel.className = 'qa-dashboard__field qa-dashboard__field--inline';
  suiteLabel.innerHTML = '<span class="qa-dashboard__label-text">Suite</span>';
  const suiteSelect = document.createElement('select');
  suiteSelect.className = 'qa-dashboard__select';
  for (const [val, txt] of [
    ['all', 'All Checks'],
    ['visual', 'Visual Diff'],
    ['links', 'Broken Links'],
    ['nav', 'Nav Links'],
    ['images', 'Missing Images'],
    ['content', 'Content QA'],
  ]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = txt;
    if (val === (settings.lastSuite || 'all')) opt.selected = true;
    suiteSelect.append(opt);
  }
  suiteLabel.append(suiteSelect);

  const threshLabel = document.createElement('label');
  threshLabel.className = 'qa-dashboard__field qa-dashboard__field--inline';
  threshLabel.innerHTML = '<span class="qa-dashboard__label-text">Threshold %</span>';
  const threshInput = document.createElement('input');
  threshInput.type = 'number';
  threshInput.className = 'qa-dashboard__input qa-dashboard__input--number';
  threshInput.min = '0';
  threshInput.max = '100';
  threshInput.step = '0.5';
  threshInput.value = settings.lastThreshold || '5';
  threshLabel.append(threshInput);

  function updateThreshVisibility() {
    threshLabel.style.display = ['all', 'visual'].includes(suiteSelect.value) ? '' : 'none';
  }
  suiteSelect.addEventListener('change', updateThreshVisibility);
  updateThreshVisibility();

  configRow.append(suiteLabel, threshLabel);

  const runBtn = document.createElement('button');
  runBtn.className = 'qa-dashboard__btn qa-dashboard__btn--primary';
  runBtn.textContent = '▶ Run Tests';

  const statusEl = document.createElement('p');
  statusEl.className = 'qa-dashboard__status';
  statusEl.setAttribute('aria-live', 'polite');

  runSection.append(prefixLabel, configRow, runBtn, statusEl);
  block.append(runSection);

  // --- Results ---
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'qa-dashboard__results';
  block.append(resultsContainer);

  // Load last results on mount
  if (settings.token && settings.branch) {
    loadResults(settings.token, settings.branch)
      .then((r) => { if (r) renderResults(resultsContainer, r); })
      .catch(() => {});
  }

  // --- Run handler ---
  runBtn.addEventListener('click', async () => {
    const { token, branch } = loadSettings();
    if (!token || !branch) {
      statusEl.className = 'qa-dashboard__status qa-dashboard__status--error';
      statusEl.textContent = 'Set your GitHub token and branch in settings first.';
      settingsDetails.open = true;
      return;
    }
    const prefix = prefixInput.value.trim();
    if (!prefix) {
      statusEl.className = 'qa-dashboard__status qa-dashboard__status--error';
      statusEl.textContent = 'Enter a path prefix.';
      return;
    }

    saveSettings({ lastPrefix: prefix, lastSuite: suiteSelect.value, lastThreshold: threshInput.value });
    runBtn.disabled = true;

    statusEl.className = 'qa-dashboard__status qa-dashboard__status--running';
    statusEl.textContent = 'Triggering workflow…';

    const startedAfter = new Date();

    try {
      await triggerRun(token, branch, {
        path_prefix: prefix,
        suite: suiteSelect.value,
        threshold: threshInput.value,
      });

      statusEl.textContent = 'Workflow triggered. Waiting for run to start…';

      const run = await pollRun(token, branch, startedAfter, (r) => {
        if (!r) {
          statusEl.textContent = 'Waiting for run to appear on GitHub…';
        } else {
          statusEl.innerHTML = `Run <a href="${r.html_url}" target="_blank" rel="noopener noreferrer">#${r.run_number}</a> is ${r.status}…`;
        }
      });

      const ok = run.conclusion === 'success';
      statusEl.className = `qa-dashboard__status ${ok ? 'qa-dashboard__status--done' : 'qa-dashboard__status--error'}`;
      statusEl.innerHTML = `Run <a href="${run.html_url}" target="_blank" rel="noopener noreferrer">#${run.run_number}</a> completed: ${run.conclusion}.`;

      await new Promise((r) => setTimeout(r, 4000));
      const results = await loadResults(token, branch);
      if (results) renderResults(resultsContainer, results);
    } catch (err) {
      statusEl.className = 'qa-dashboard__status qa-dashboard__status--error';
      statusEl.textContent = `Error: ${err.message}`;
    } finally {
      runBtn.disabled = false;
    }
  });
}
