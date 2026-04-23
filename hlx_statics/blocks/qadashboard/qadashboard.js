const REPO = 'AdobeDocs/adp-devsite-github-actions-test';
const RESULTS_BRANCH = 'main';
const WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/qa-run.yml`;
const LS_KEY = 'qadashboard_params';
const PROD_BASE = 'https://developer.adobe.com';
const STAGE_BASE = 'https://developer-stage.adobe.com';

async function loadResults(pathPrefix) {
  const path = `tools/qa/results${pathPrefix}/latest.json`;
  const url = `https://raw.githubusercontent.com/${REPO}/${RESULTS_BRANCH}/${path}?_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function loadIndex() {
  const url = `https://raw.githubusercontent.com/${REPO}/${RESULTS_BRANCH}/tools/qa/results/index.json?_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

const SUITE_LABELS = {
  visual: 'Visual Diff',
  links: 'Broken Links',
  nav: 'Nav Links',
  images: 'Missing Images',
  content: 'Content QA',
};

function loadSavedParams() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveParams(params) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(params));
  } catch { /* ignore */ }
}

// Split issue text into path and description.
// Handles both "/path — desc" and "suite: /path — desc" formats.
function parseIssuePath(text) {
  const sep = ' — ';
  const idx = text.indexOf(sep);
  const before = idx > 0 ? text.slice(0, idx) : text;
  const desc = idx > 0 ? text.slice(idx + sep.length) : '';
  // Path is either the whole token (starts with /) or after "suite: "
  const pathMatch = before.match(/(?:^|:\s)(\/\S+)$/);
  if (pathMatch) return { path: pathMatch[1], desc };
  return { path: null, desc: text };
}

function renderOverview(container, index, onLoad) {
  container.innerHTML = '';
  if (!index || !index.length) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  const heading = document.createElement('h3');
  heading.className = 'qadashboard__overview-heading';
  heading.textContent = 'All Path Prefixes';
  container.append(heading);

  const table = document.createElement('table');
  table.className = 'qadashboard__overview-table';

  for (const entry of index) {
    const tr = document.createElement('tr');
    tr.className = 'qadashboard__overview-row';

    const tdPath = document.createElement('td');
    tdPath.className = 'qadashboard__overview-path';
    tdPath.textContent = entry.path_prefix;

    const tdTs = document.createElement('td');
    tdTs.className = 'qadashboard__overview-ts';
    tdTs.textContent = new Date(entry.timestamp).toLocaleString();

    const tdStatus = document.createElement('td');
    const passed = entry.status === 'passed';
    const badge = document.createElement('span');
    badge.className = `qadashboard__badge ${passed ? 'qadashboard__badge--pass' : 'qadashboard__badge--fail'}`;
    badge.textContent = passed ? '✓ Passed' : '✗ Failed';
    tdStatus.append(badge);

    const tdSuite = document.createElement('td');
    tdSuite.className = 'qadashboard__overview-suite';
    tdSuite.textContent = entry.suite;

    const tdAction = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'qadashboard__btn qadashboard__btn--secondary qadashboard__btn--xs';
    btn.textContent = 'Load';
    btn.addEventListener('click', () => onLoad(entry.path_prefix));
    tdAction.append(btn);

    tr.append(tdPath, tdTs, tdStatus, tdSuite, tdAction);
    table.append(tr);
  }
  container.append(table);
}

function renderResults(container, results) {
  container.innerHTML = '';

  if (!results || !results.timestamp) {
    const p = document.createElement('p');
    p.className = 'qadashboard__empty';
    p.textContent = results?.message || 'Enter a path prefix above and click Refresh to load results.';
    container.append(p);
    return;
  }

  const ts = new Date(results.timestamp).toLocaleString();
  const passed = results.status === 'passed';

  const header = document.createElement('div');
  header.className = 'qadashboard__results-header';

  const meta = document.createElement('span');
  meta.className = 'qadashboard__results-meta';
  meta.textContent = `${ts} · ${results.path_prefix} · suite: ${results.suite}`;

  const badge = document.createElement('span');
  badge.className = `qadashboard__badge ${passed ? 'qadashboard__badge--pass' : 'qadashboard__badge--fail'}`;
  badge.textContent = passed ? '✓ All Passed' : '✗ Issues Found';

  header.append(meta, badge);

  const reportHref = results.report_url || results.run_url;
  if (reportHref) {
    const reportLink = document.createElement('a');
    reportLink.className = 'qadashboard__btn qadashboard__btn--secondary';
    reportLink.href = reportHref;
    reportLink.target = '_blank';
    reportLink.rel = 'noopener noreferrer';
    reportLink.textContent = '↗ View Full Report';
    header.append(reportLink);
  }

  container.append(header);

  const cards = document.createElement('div');
  cards.className = 'qadashboard__cards';

  for (const [key, label] of Object.entries(SUITE_LABELS)) {
    const s = results.suites?.[key];
    if (!s || (s.passed === 0 && s.failed === 0 && s.skipped === 0)) continue;
    const ok = s.failed === 0;
    const card = document.createElement('div');
    card.className = `qadashboard__card ${ok ? 'qadashboard__card--pass' : 'qadashboard__card--fail'}`;
    const count = s.failed > 0 ? `${s.failed} issue${s.failed !== 1 ? 's' : ''}` : `${s.passed} passed`;
    card.innerHTML = `
      <div class="qadashboard__card-label">${label}</div>
      <div class="qadashboard__card-count">${count}</div>
      <div class="qadashboard__card-sub">${s.passed} passed · ${s.failed} failed</div>
    `;
    cards.append(card);
  }
  container.append(cards);

  const allIssues = Object.entries(results.suites || {})
    .flatMap(([key, s]) => (s.issues || []).map((text) => ({ key, text })));

  if (allIssues.length) {
    const section = document.createElement('div');
    section.className = 'qadashboard__issues';
    const h = document.createElement('h3');
    h.className = 'qadashboard__issues-heading';
    h.textContent = `Issues (${allIssues.length})`;
    section.append(h);
    const ul = document.createElement('ul');
    ul.className = 'qadashboard__issues-list';
    for (const { key, text } of allIssues) {
      const li = document.createElement('li');
      li.className = 'qadashboard__issue-item';

      const suite = document.createElement('span');
      suite.className = 'qadashboard__issue-suite';
      suite.textContent = key;

      const { path, desc } = parseIssuePath(text);

      const msg = document.createElement('span');
      msg.className = 'qadashboard__issue-text';
      msg.textContent = path ? `${path}${desc ? ' — ' + desc : ''}` : text;

      li.append(suite, msg);

      if (path) {
        const links = document.createElement('span');
        links.className = 'qadashboard__issue-links';

        const prodLink = document.createElement('a');
        prodLink.href = `${PROD_BASE}${path}`;
        prodLink.target = '_blank';
        prodLink.rel = 'noopener noreferrer';
        prodLink.textContent = 'prod';

        const stageLink = document.createElement('a');
        stageLink.href = `${STAGE_BASE}${path}`;
        stageLink.target = '_blank';
        stageLink.rel = 'noopener noreferrer';
        stageLink.textContent = 'stage';

        links.append(prodLink, ' · ', stageLink);
        li.append(links);
      }

      ul.append(li);
    }
    section.append(ul);
    container.append(section);
  }
}

function getBranch(block) {
  // AEM EDS URLs follow the pattern: {branch}--{repo}--{org}.aem.page
  const parts = window.location.hostname.split('--');
  if (parts.length >= 3) return parts[0];
  // fallback: read from block table cell, then hardcoded default
  return block.querySelector('div > div')?.textContent?.trim() || 'devsite-2359';
}

export default async function decorate(block) {
  const branch = getBranch(block);
  block.textContent = '';
  block.classList.add('block', 'qadashboard');

  const heading = document.createElement('h2');
  heading.className = 'qadashboard__heading';
  heading.textContent = 'QA Dashboard — Prod vs Stage';
  block.append(heading);

  // --- Overview (all path prefixes) ---
  const overviewContainer = document.createElement('div');
  overviewContainer.className = 'qadashboard__overview';
  overviewContainer.style.display = 'none';
  block.append(overviewContainer);

  // --- Run parameters form ---
  const saved = loadSavedParams();

  const form = document.createElement('div');
  form.className = 'qadashboard__form';

  const pathLabel = document.createElement('label');
  pathLabel.className = 'qadashboard__form-label';
  pathLabel.textContent = 'Path prefix';
  const pathInput = document.createElement('input');
  pathInput.type = 'text';
  pathInput.className = 'qadashboard__form-input';
  pathInput.placeholder = '/experience-cloud/cloud-manager';
  pathInput.value = saved.path_prefix || '';
  pathLabel.append(pathInput);

  const suiteLabel = document.createElement('label');
  suiteLabel.className = 'qadashboard__form-label';
  suiteLabel.textContent = 'Suite';
  const suiteSelect = document.createElement('select');
  suiteSelect.className = 'qadashboard__form-select';
  for (const val of ['all', 'visual', 'links', 'nav', 'images', 'content']) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    if (val === (saved.suite || 'all')) opt.selected = true;
    suiteSelect.append(opt);
  }
  suiteLabel.append(suiteSelect);

  const threshLabel = document.createElement('label');
  threshLabel.className = 'qadashboard__form-label';
  threshLabel.textContent = 'Visual threshold %';
  const threshInput = document.createElement('input');
  threshInput.type = 'number';
  threshInput.className = 'qadashboard__form-input qadashboard__form-input--short';
  threshInput.min = '0';
  threshInput.max = '100';
  threshInput.value = saved.threshold ?? '5';
  threshLabel.append(threshInput);

  form.append(pathLabel, suiteLabel, threshLabel);
  block.append(form);

  // --- Toolbar ---
  const toolbar = document.createElement('div');
  toolbar.className = 'qadashboard__toolbar';

  const branchTag = document.createElement('span');
  branchTag.className = 'qadashboard__branch';
  branchTag.textContent = `branch: ${branch}`;
  toolbar.append(branchTag);

  const actions = document.createElement('div');
  actions.className = 'qadashboard__actions';

  const runLink = document.createElement('a');
  runLink.className = 'qadashboard__btn qadashboard__btn--primary';
  runLink.href = WORKFLOW_URL;
  runLink.target = '_blank';
  runLink.rel = 'noopener noreferrer';
  runLink.textContent = '▶ Run on GitHub';
  actions.append(runLink);

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'qadashboard__btn qadashboard__btn--secondary';
  refreshBtn.textContent = '↻ Refresh';
  actions.append(refreshBtn);

  toolbar.append(actions);
  block.append(toolbar);

  const hint = document.createElement('p');
  hint.className = 'qadashboard__hint';
  hint.textContent = 'Set your parameters above, then click "Run on GitHub" and paste them into the workflow form.';
  block.append(hint);

  const statusEl = document.createElement('p');
  statusEl.className = 'qadashboard__status';
  statusEl.setAttribute('aria-live', 'polite');
  block.append(statusEl);

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'qadashboard__results';
  block.append(resultsContainer);

  function updateThresholdVisibility() {
    const show = suiteSelect.value === 'all' || suiteSelect.value === 'visual';
    threshLabel.style.display = show ? '' : 'none';
  }

  function onParamChange() {
    const params = {
      path_prefix: pathInput.value.trim(),
      suite: suiteSelect.value,
      threshold: threshInput.value,
    };
    saveParams(params);
    updateThresholdVisibility();
  }

  pathInput.addEventListener('input', onParamChange);
  suiteSelect.addEventListener('change', onParamChange);
  threshInput.addEventListener('input', onParamChange);
  updateThresholdVisibility();

  async function refresh() {
    const prefix = pathInput.value.trim();
    if (!prefix) {
      renderResults(resultsContainer, null);
      statusEl.textContent = '';
      statusEl.className = 'qadashboard__status';
      refreshBtn.disabled = false;
      return;
    }
    refreshBtn.disabled = true;
    statusEl.className = 'qadashboard__status qadashboard__status--running';
    statusEl.textContent = 'Loading results…';
    try {
      const results = await loadResults(prefix);
      // sync form fields to match what was actually last run
      if (results?.path_prefix) pathInput.value = results.path_prefix;
      if (results?.suite) suiteSelect.value = results.suite;
      if (results?.threshold != null) threshInput.value = results.threshold;
      onParamChange();
      renderResults(resultsContainer, results);
      statusEl.textContent = '';
      statusEl.className = 'qadashboard__status';
    } catch {
      statusEl.className = 'qadashboard__status qadashboard__status--error';
      statusEl.textContent = 'Could not load results.';
    } finally {
      refreshBtn.disabled = false;
    }
  }

  function loadPrefix(prefix) {
    pathInput.value = prefix;
    onParamChange();
    refresh();
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  refreshBtn.addEventListener('click', refresh);

  // Load overview index and per-prefix results in parallel
  const [, index] = await Promise.all([
    refresh(),
    loadIndex(),
  ]);
  renderOverview(overviewContainer, index, loadPrefix);
}
