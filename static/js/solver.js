/**
 * static/js/solver.js
 *
 * Handles the entire Solver page workflow:
 *   - Item CRUD (add / edit inline / delete / import presets)
 *   - Form validation
 *   - API request to /api/solve
 *   - Triggering visualizer and chart modules
 *   - Save-to-history flow
 */

'use strict';

/* -------------------------------------------------------------------------
   State
   ------------------------------------------------------------------------- */

let items        = [];   // [{name, weight, value}, ...]
let lastResult   = null; // last response from /api/solve
let nextItemId   = 1;    // local ID counter for table rows

/* -------------------------------------------------------------------------
   Preset problems
   ------------------------------------------------------------------------- */

const PRESETS = {
  classic: {
    label   : '📦 Classic Textbook',
    capacity: 50,
    items   : [
      { name: 'Item A', weight: 10, value: 60 },
      { name: 'Item B', weight: 20, value: 100 },
      { name: 'Item C', weight: 30, value: 120 },
    ],
  },
  jewels: {
    label   : '💎 Jewel Heist',
    capacity: 15,
    items   : [
      { name: 'Diamond',  weight: 5,  value: 200 },
      { name: 'Ruby',     weight: 3,  value: 150 },
      { name: 'Emerald',  weight: 4,  value: 120 },
      { name: 'Sapphire', weight: 7,  value: 170 },
      { name: 'Gold Bar',  weight: 8,  value: 130 },
      { name: 'Pearl',    weight: 2,  value: 80  },
    ],
  },
  greedy_fails: {
    label   : '⚠️ Greedy Fails',
    capacity: 10,
    items   : [
      { name: 'High-ratio', weight: 6, value: 30 },
      { name: 'Combo-1',    weight: 5, value: 25 },
      { name: 'Combo-2',    weight: 5, value: 25 },
    ],
  },
  expedition: {
    label   : '🏔️ Expedition Pack',
    capacity: 60,
    items   : [
      { name: 'Tent',        weight: 15, value: 80  },
      { name: 'Food Rations',weight: 10, value: 70  },
      { name: 'First Aid',   weight: 5,  value: 90  },
      { name: 'Camera',      weight: 8,  value: 60  },
      { name: 'Sleeping Bag',weight: 12, value: 75  },
      { name: 'Stove',       weight: 7,  value: 50  },
      { name: 'Water Filter',weight: 4,  value: 85  },
      { name: 'Map & Compass',weight:1,  value: 40  },
    ],
  },
};

/* -------------------------------------------------------------------------
   DOM helpers
   ------------------------------------------------------------------------- */

const $ = id => document.getElementById(id);
const tbody = () => $('item-tbody');

function renderRow(item, localId) {
  const ratio = item.weight > 0 ? (item.value / item.weight).toFixed(2) : '∞';
  const tr    = document.createElement('tr');
  tr.dataset.lid = localId;

  tr.innerHTML = `
    <td class="idx-cell">#${localId}</td>
    <td><input class="item-name"   type="text"   value="${escHtml(item.name)}"   placeholder="Item name" /></td>
    <td><input class="item-weight" type="number" value="${item.weight}" min="1" max="999" /></td>
    <td><input class="item-value"  type="number" value="${item.value}"  min="0" max="9999" /></td>
    <td><span class="ratio-badge">${ratio}</span></td>
    <td>
      <button class="btn btn-ghost btn-sm del-btn" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </td>`;

  // Ratio auto-update
  const wInp = tr.querySelector('.item-weight');
  const vInp = tr.querySelector('.item-value');
  const badge = tr.querySelector('.ratio-badge');
  const updateRatio = () => {
    const w = parseFloat(wInp.value) || 0;
    const v = parseFloat(vInp.value) || 0;
    badge.textContent = w > 0 ? (v / w).toFixed(2) : '∞';
  };
  wInp.addEventListener('input', updateRatio);
  vInp.addEventListener('input', updateRatio);

  // Delete button
  tr.querySelector('.del-btn').addEventListener('click', () => {
    tr.remove();
    updateItemCount();
  });

  return tr;
}

function updateItemCount() {
  const count = tbody().querySelectorAll('tr').length;
  $('item-count').textContent = count;
  $('solve-btn').disabled = count === 0;
}

function collectItems() {
  const rows  = tbody().querySelectorAll('tr');
  const result = [];
  for (const tr of rows) {
    const name   = tr.querySelector('.item-name').value.trim() || 'Unnamed';
    const weight = parseInt(tr.querySelector('.item-weight').value, 10);
    const value  = parseInt(tr.querySelector('.item-value').value, 10);
    if (isNaN(weight) || isNaN(value) || weight < 1) continue;
    result.push({ name, weight, value });
  }
  return result;
}

function addItemRow(item = { name: '', weight: 1, value: 10 }) {
  const tr = renderRow(item, nextItemId++);
  tbody().appendChild(tr);
  tr.querySelector('.item-name').focus();
  updateItemCount();
}

function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  tbody().innerHTML = '';
  nextItemId = 1;
  $('capacity').value = preset.capacity;
  preset.items.forEach(it => addItemRow(it));
  toast(`Loaded: ${preset.label}`, 'info');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* -------------------------------------------------------------------------
   Solve
   ------------------------------------------------------------------------- */

async function solve() {
  items = collectItems();
  if (items.length === 0) { toast('Add at least one item.', 'error'); return; }
  if (items.length > 25)  { toast('Max 25 items for visualization.', 'error'); return; }

  const capacity = parseInt($('capacity').value, 10);
  if (!capacity || capacity < 1) { toast('Enter a valid capacity.', 'error'); return; }

  // Show loading
  $('solve-btn').disabled = true;
  $('solve-btn').innerHTML = '<div class="spinner"></div> Solving…';
  $('results-section').classList.add('hidden');

  try {
    const res  = await fetch('/api/solve', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ items, capacity }),
    });
    const data = await res.json();

    if (!res.ok) { toast(data.error || 'Solve failed.', 'error'); return; }

    lastResult = data;

    // Compute efficiency for each greedy strategy
    for (const key of Object.keys(data.greedy)) {
      const g = data.greedy[key];
      g.efficiency_pct = data.dp.optimal_value > 0
        ? Math.round(g.optimal_value / data.dp.optimal_value * 100)
        : 100;
    }

    renderResults(data);
    window.visualizer?.animate(data);
    window.chartManager?.render(data);

    $('results-section').classList.remove('hidden');
    $('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Enable save
    $('save-btn').disabled = false;

  } catch (err) {
    toast('Network error — is the server running?', 'error');
    console.error(err);
  } finally {
    $('solve-btn').disabled = false;
    $('solve-btn').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg> Solve`;
  }
}

/* -------------------------------------------------------------------------
   Render results
   ------------------------------------------------------------------------- */

function renderResults(data) {
  const dp = data.dp;

  // DP card
  $('dp-value').textContent   = dp.optimal_value;
  $('dp-weight').textContent  = `${dp.total_weight} / ${data.capacity}`;
  $('dp-time').textContent    = `${dp.time_ms.toFixed(3)} ms`;
  $('dp-items-count').textContent = dp.selected.length;

  renderSelectedItems('dp-selected', dp.selected, 'cyan');

  // Greedy cards
  for (const [key, g] of Object.entries(data.greedy)) {
    $(`g-${key}-value`).textContent  = g.optimal_value;
    $(`g-${key}-weight`).textContent = `${g.total_weight} / ${data.capacity}`;
    $(`g-${key}-time`).textContent   = `${g.time_ms.toFixed(3)} ms`;
    $(`g-${key}-eff`).textContent    = `${g.efficiency_pct}%`;

    // Efficiency ring
    const ring = $(`g-${key}-ring`);
    if (ring) {
      const pct    = g.efficiency_pct / 100;
      const offset = 163 - (163 * pct);
      ring.style.strokeDashoffset = offset;
      ring.style.stroke = effColor(g.efficiency_pct);
    }

    renderSelectedItems(`g-${key}-selected`, g.selected, keyColor(key));
  }

  // Complexity info
  $('complexity-dp').textContent      = `O(n·W) = O(${dp.n_items}×${data.capacity}) = ${dp.n_items * data.capacity}`;
  $('complexity-greedy').textContent  = `O(n log n) = O(${dp.n_items} log ${dp.n_items})`;
}

function renderSelectedItems(containerId, selected, color) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = selected.length === 0
    ? `<p class="text-muted" style="font-size:.8rem">No items selected.</p>`
    : selected.map(it => `
      <div class="selected-item-row">
        <span class="selected-item-name">${escHtml(it.name)}</span>
        <span class="selected-item-meta">
          <span>W: ${it.weight}</span>
          <span>V: ${it.value}</span>
          <span class="mono" style="color:var(--${color})">${(it.value/it.weight).toFixed(2)}</span>
        </span>
      </div>`).join('');
}

function effColor(pct) {
  if (pct >= 95) return 'var(--green)';
  if (pct >= 80) return 'var(--amber)';
  return 'var(--red)';
}

function keyColor(key) {
  return { ratio: 'amber', value: 'purple', weight: 'green' }[key] || 'accent';
}

/* -------------------------------------------------------------------------
   Save to history
   ------------------------------------------------------------------------- */

async function saveToHistory() {
  if (!lastResult) return;

  const name = prompt('Name this problem:', `Problem — ${items.length} items, cap ${lastResult.capacity}`);
  if (name === null) return;  // user cancelled

  const res  = await fetch('/api/save', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      name,
      items    : items,
      capacity : lastResult.capacity,
      dp_result: lastResult.dp,
      greedy_result: lastResult.greedy,
    }),
  });
  const data = await res.json();

  if (res.ok) toast(`Saved as "${name}"`, 'success');
  else        toast(data.error || 'Save failed.', 'error');
}

/* -------------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Preset chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => loadPreset(chip.dataset.preset));
  });

  // Add row button
  $('add-item-btn')?.addEventListener('click', () => addItemRow());

  // Solve button
  $('solve-btn')?.addEventListener('click', solve);

  // Save button
  $('save-btn')?.addEventListener('click', saveToHistory);

  // Clear button
  $('clear-btn')?.addEventListener('click', () => {
    if (!confirm('Clear all items?')) return;
    tbody().innerHTML = '';
    nextItemId = 1;
    updateItemCount();
    $('results-section').classList.add('hidden');
    lastResult = null;
    $('save-btn').disabled = true;
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.tabGroup;
      const target = btn.dataset.tab;

      document.querySelectorAll(`[data-tab-group="${group}"].tab-btn`).forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      document.querySelectorAll(`[data-tab-panel="${group}"]`).forEach(p =>
        p.classList.toggle('active', p.dataset.tab === target)
      );
    });
  });

  // Load classic preset by default
  loadPreset('classic');

  updateItemCount();
});
