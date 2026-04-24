/**
 * script.js — Frontend logic for BFHL Hierarchy Processor
 */

// --- Configuration ---
// When running locally via Vercel dev, use relative URL.
// When deployed, this also works since frontend and API share the same origin.
const API_URL = '/bfhl';

// --- DOM Elements ---
const dataInput = document.getElementById('data-input');
const submitBtn = document.getElementById('submit-btn');
const loadExampleBtn = document.getElementById('load-example');
const errorToast = document.getElementById('error-toast');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');

// Results elements
const identityGrid = document.getElementById('identity-grid');
const totalTreesEl = document.getElementById('total-trees');
const totalCyclesEl = document.getElementById('total-cycles');
const largestRootEl = document.getElementById('largest-root');
const hierarchiesGrid = document.getElementById('hierarchies-grid');
const invalidBadges = document.getElementById('invalid-badges');
const duplicateBadges = document.getElementById('duplicate-badges');
const rawJsonContent = document.getElementById('raw-json-content');

// --- Example Data ---
const EXAMPLE_DATA = `A->B, A->C, B->D, C->E, E->F,
X->Y, Y->Z, Z->X,
P->Q, Q->R,
G->H, G->H, G->I,
hello, 1->2, A->`;

// --- Event Listeners ---
loadExampleBtn.addEventListener('click', () => {
  dataInput.value = EXAMPLE_DATA;
  dataInput.focus();
});

submitBtn.addEventListener('click', handleSubmit);

dataInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    handleSubmit();
  }
});

// --- Main Submit Handler ---
async function handleSubmit() {
  const raw = dataInput.value.trim();
  if (!raw) {
    showError('Please enter some node data.');
    return;
  }

  // Parse input: split by commas and newlines, trim, remove empty
  const data = raw
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (data.length === 0) {
    showError('No valid entries found. Please check your input.');
    return;
  }

  hideError();
  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `Server returned ${response.status}`);
    }

    const result = await response.json();
    renderResults(result);
  } catch (err) {
    showError(err.message || 'Failed to connect to the API. Please try again.');
  } finally {
    setLoading(false);
  }
}

// --- Render Results ---
function renderResults(data) {
  resultsSection.hidden = false;

  // Identity
  identityGrid.innerHTML = '';
  const identityFields = [
    { label: 'User ID', value: data.user_id },
    { label: 'Email', value: data.email_id },
    { label: 'Roll Number', value: data.college_roll_number }
  ];
  identityFields.forEach(f => {
    const div = document.createElement('div');
    div.className = 'identity-item';
    div.innerHTML = `<div class="label">${f.label}</div><div class="value">${escapeHtml(f.value || '—')}</div>`;
    identityGrid.appendChild(div);
  });

  // Summary
  const s = data.summary || {};
  animateNumber(totalTreesEl, s.total_trees || 0);
  animateNumber(totalCyclesEl, s.total_cycles || 0);
  largestRootEl.textContent = s.largest_tree_root || '—';

  // Hierarchies
  hierarchiesGrid.innerHTML = '';
  (data.hierarchies || []).forEach((h, idx) => {
    const card = document.createElement('div');
    card.className = 'hierarchy-card';
    card.style.animationDelay = `${idx * 0.08}s`;

    const isCycle = !!h.has_cycle;
    let badgesHtml = isCycle
      ? `<span class="hierarchy-badge badge-cycle">⟳ Cycle</span>`
      : `<span class="hierarchy-badge badge-tree">✓ Tree</span>`;
    
    if (!isCycle && h.depth !== undefined) {
      badgesHtml += ` <span class="hierarchy-badge badge-depth">Depth: ${h.depth}</span>`;
    }

    let treeHtml;
    if (isCycle) {
      treeHtml = `<div class="cycle-message">⚠ Cycle detected — all nodes in this group form a loop.</div>`;
    } else {
      treeHtml = `<div class="tree-view">${renderTreeObject(h.tree, true)}</div>`;
    }

    card.innerHTML = `
      <div class="hierarchy-header">
        <span class="hierarchy-root">Root: ${escapeHtml(h.root)}</span>
        <div>${badgesHtml}</div>
      </div>
      ${treeHtml}
    `;
    hierarchiesGrid.appendChild(card);
  });

  // Invalid entries
  invalidBadges.innerHTML = '';
  const invalids = data.invalid_entries || [];
  if (invalids.length === 0) {
    invalidBadges.innerHTML = '<span class="badge badge-none">None</span>';
  } else {
    invalids.forEach(e => {
      const span = document.createElement('span');
      span.className = 'badge badge-invalid';
      span.textContent = e || '(empty)';
      invalidBadges.appendChild(span);
    });
  }

  // Duplicate edges
  duplicateBadges.innerHTML = '';
  const dupes = data.duplicate_edges || [];
  if (dupes.length === 0) {
    duplicateBadges.innerHTML = '<span class="badge badge-none">None</span>';
  } else {
    dupes.forEach(e => {
      const span = document.createElement('span');
      span.className = 'badge badge-duplicate';
      span.textContent = e;
      duplicateBadges.appendChild(span);
    });
  }

  // Raw JSON
  rawJsonContent.textContent = JSON.stringify(data, null, 2);

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Render Tree Object as nested HTML ---
function renderTreeObject(obj, isRoot) {
  if (!obj || typeof obj !== 'object') return '';
  const keys = Object.keys(obj);
  if (keys.length === 0) return '';

  let html = '';
  keys.forEach(key => {
    const childObj = obj[key];
    const childKeys = Object.keys(childObj || {});
    const cls = isRoot ? 'tree-node tree-root' : 'tree-node';
    
    html += `<div class="${cls}">`;
    html += `<div class="tree-node-label">${escapeHtml(key)}</div>`;
    if (childKeys.length > 0) {
      html += renderTreeObject(childObj, false);
    }
    html += `</div>`;
  });
  return html;
}

// --- Helpers ---
function showError(msg) {
  errorMessage.textContent = msg;
  errorToast.hidden = false;
}

function hideError() {
  errorToast.hidden = true;
}

function setLoading(loading) {
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  if (loading) {
    btnText.textContent = 'Processing…';
    btnLoader.hidden = false;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
  } else {
    btnText.textContent = 'Process Data';
    btnLoader.hidden = true;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }
}

function animateNumber(el, target) {
  const duration = 600;
  const start = parseInt(el.textContent) || 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
