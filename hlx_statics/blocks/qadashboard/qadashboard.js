const REPO = 'AdobeDocs/adp-devsite';
const RESULTS_PATH = 'tools/qa/results/latest.json';
const WORKFLOW_URL = `https://github.com/${REPO}/actions/workflows/commit-test.yml`;

async function loadResults(branch) {
  const url = `https://raw.githubusercontent.com/${REPO}/${encodeURIComponent(branch)}/${RESULTS_PATH}?_=${Date.now()}`;
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

function renderResults(container, results) {
  container.innerHTML = '';

  if (!results || !results.timestamp) {
    const p = document.createElement('p');
    p.className = 'qadashboard__empty';
    p.textContent = results?.message || 'No results yet. Trigger a run on GitHub Actions.';
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
      const msg = document.createElement('span');
      msg.className = 'qadashboard__issue-text';
      msg.textContent = text;
      li.append(suite, msg);
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

  const statusEl = document.createElement('p');
  statusEl.className = 'qadashboard__status';
  statusEl.setAttribute('aria-live', 'polite');
  block.append(statusEl);

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'qadashboard__results';
  block.append(resultsContainer);

  async function refresh() {
    refreshBtn.disabled = true;
    statusEl.className = 'qadashboard__status qadashboard__status--running';
    statusEl.textContent = 'Loading results…';
    try {
      const results = await loadResults(branch);
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

  refreshBtn.addEventListener('click', refresh);
  refresh();
}
