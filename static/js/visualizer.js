/**
 * static/js/visualizer.js
 *
 * Animates:
 *   1. The DP table — cell-by-cell fill with optional step-through mode
 *   2. The Greedy decision steps — slide-in cards per decision
 *
 * The speed slider controls animation delay between steps.
 * "Step-through" mode pauses at each cell and waits for a click.
 */

'use strict';

window.visualizer = (() => {

  /* ---- State ---- */
  let animationTimer  = null;
  let stepIndex       = 0;
  let currentData     = null;
  let isPaused        = false;
  let isStepMode      = false;

  /* ---- DOM helpers ---- */
  const $ = id => document.getElementById(id);

  /* ======================================================================
     Public API
     ====================================================================== */

  function animate(data) {
    currentData = data;
    stopAnimation();
    buildDPTable(data);
    buildGreedySteps(data, 'ratio');   // default tab shown
  }

  /* ======================================================================
     DP Table
     ====================================================================== */

  function buildDPTable(data) {
    const container = $('dp-table-container');
    if (!container) return;
    container.innerHTML = '';

    const { table, n_items, capacity, steps, backtrack_path, selected } = data.dp;

    if (n_items > 20 || capacity > 60) {
      container.innerHTML = `
        <p class="text-secondary" style="padding:24px;font-size:.85rem;">
          DP table has ${(n_items + 1) * (capacity + 1)} cells — too large to animate.<br>
          Results are still correct; reduce items/capacity to see the table.
        </p>`;
      return;
    }

    // Build selected item indices
    const selectedIndices = new Set(
      (selected || []).map(it => it.original_index)
    );

    // Build backtrack set for fast lookup
    const btSet = new Set((backtrack_path || []).map(([r, c]) => `${r},${c}`));

    /* ---- Header row ---- */
    const tbl  = document.createElement('table');
    tbl.className = 'dp-table';
    const thead = tbl.createTHead();
    const hRow  = thead.insertRow();

    hRow.insertCell().className = 'row-label';       // corner cell

    // Column headers (weights 0..W)
    for (let w = 0; w <= capacity; w++) {
      const th       = document.createElement('th');
      th.textContent = w;
      if (w === capacity) th.style.color = 'var(--accent)';
      hRow.appendChild(th);
    }

    /* ---- Body rows ---- */
    const tbody_el = tbl.createTBody();
    const cellRefs = [];   // [row][col] → <td>

    for (let i = 0; i <= n_items; i++) {
      const tr    = tbody_el.insertRow();
      const label = tr.insertCell();
      label.className  = 'row-label';
      label.textContent = i === 0
        ? '∅'
        : (data.dp.n_items <= 15
            ? `[${i}] ${data.items ? data.items[i-1]?.name.substring(0,8) : i}`
            : `Item ${i}`);

      const rowRefs = [];
      for (let w = 0; w <= capacity; w++) {
        const td        = tr.insertCell();
        td.className    = 'dp-cell';
        td.textContent  = '·';
        td.title        = `dp[${i}][${w}] = ${table[i][w]}`;
        rowRefs.push(td);
      }
      cellRefs.push(rowRefs);
    }

    // Row 0 immediately visible (all zeros)
    for (let w = 0; w <= capacity; w++) {
      cellRefs[0][w].textContent = '0';
      cellRefs[0][w].classList.add('filled');
    }

    container.appendChild(tbl);

    /* ---- Animate fill ---- */
    const delay     = getSpeedDelay();
    const filtered  = steps.filter(s => s.row > 0); // skip row-0 (already shown)

    let idx = 0;
    function nextStep() {
      if (idx >= filtered.length) {
        // All filled — now highlight backtrack path
        setTimeout(() => highlightBacktrack(cellRefs, btSet, selectedIndices, backtrack_path), 200);
        return;
      }

      const s  = filtered[idx];
      const td = cellRefs[s.row][s.col];
      td.textContent = s.value;
      td.classList.add('filled', 'animating');
      setTimeout(() => td.classList.remove('animating'), 300);

      idx++;

      if (isStepMode) {
        // paused; next step called by button click
      } else {
        animationTimer = setTimeout(nextStep, delay);
      }
    }

    // Expose step function for step-mode button
    window._dpNextStep = nextStep;
    nextStep();
  }

  function highlightBacktrack(cellRefs, btSet, selectedIndices, backtrack_path) {
    if (!backtrack_path) return;
    backtrack_path.forEach(([r, c], i) => {
      setTimeout(() => {
        const td = cellRefs[r]?.[c];
        if (!td) return;
        td.classList.add('highlight-backtrack');
        // If this row corresponds to a selected item, add extra class
        if (r > 0 && selectedIndices.has(r - 1)) {
          td.classList.add('selected-item');
        }
      }, i * 80);
    });
  }

  function getSpeedDelay() {
    const slider = $('speed-slider');
    if (!slider) return 60;
    // slider 1-10; map to 200ms → 10ms
    const v = parseInt(slider.value, 10);
    return Math.round(210 - v * 20);
  }

  function stopAnimation() {
    clearTimeout(animationTimer);
    animationTimer = null;
  }

  /* ======================================================================
     Greedy Steps
     ====================================================================== */

  function buildGreedySteps(data, strategy) {
    const container = $(`greedy-steps-${strategy}`);
    if (!container) return;
    container.innerHTML = '';

    const g = data.greedy?.[strategy];
    if (!g) return;

    const steps = g.steps || [];
    if (steps.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size:.8rem">No steps recorded.</p>';
      return;
    }

    steps.forEach((step, i) => {
      const div = document.createElement('div');
      div.className = `step-item ${step.action}`;
      div.style.animationDelay = `${i * 40}ms`;

      const icon = step.action === 'take' ? '✓' : '✕';
      div.innerHTML = `
        <div class="step-icon">${icon}</div>
        <div style="flex:1">
          <div class="step-name">${escHtml(step.item)}</div>
          <div class="step-reason">${escHtml(step.reason)}</div>
        </div>
        <div class="step-meta">
          <div>W: ${step.weight}</div>
          <div>V: ${step.value}</div>
          <div style="color:var(--accent)">${step.ratio}</div>
        </div>`;

      container.appendChild(div);
    });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ======================================================================
     Event wiring
     ====================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    // Greedy strategy tabs
    document.querySelectorAll('[data-greedy-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-greedy-tab]').forEach(b =>
          b.classList.toggle('active', b === btn)
        );
        document.querySelectorAll('[data-greedy-panel]').forEach(p => {
          p.classList.toggle('hidden', p.dataset.greedyPanel !== btn.dataset.greedyTab);
        });
        if (currentData) {
          buildGreedySteps(currentData, btn.dataset.greedyTab);
        }
      });
    });

    // Step-through mode toggle
    $('step-mode-btn')?.addEventListener('click', () => {
      isStepMode = !isStepMode;
      const btn = $('step-mode-btn');
      btn.textContent = isStepMode ? '▶ Auto' : '⏸ Step';
      btn.classList.toggle('btn-secondary', !isStepMode);
      btn.classList.toggle('btn-primary',    isStepMode);
    });

    // Manual next step
    $('next-step-btn')?.addEventListener('click', () => {
      if (window._dpNextStep) window._dpNextStep();
    });

    // Speed slider label
    $('speed-slider')?.addEventListener('input', function () {
      $('speed-label').textContent = `${this.value}×`;
    });

    // Replay button
    $('replay-btn')?.addEventListener('click', () => {
      if (currentData) animate(currentData);
    });
  });

  return { animate, buildGreedySteps };

})();
