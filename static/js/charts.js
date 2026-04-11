/**
 * static/js/charts.js
 *
 * Manages Chart.js instances for the Solver and Benchmark pages.
 *
 * Solver page charts:
 *   - Bar chart: Value comparison across algorithms
 *   - Radar chart: Multi-metric algorithm comparison
 *
 * Benchmark page chart:
 *   - Line chart: Runtime vs problem size
 *   - Line chart: Greedy efficiency vs problem size
 */

'use strict';

window.chartManager = (() => {

  /* ---- Chart instances (kept for destroy on re-render) ---- */
  let barChart    = null;
  let radarChart  = null;

  /* ---- Colour tokens (CSS vars resolved at runtime) ---- */
  function cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }

  function themeColors() {
    return {
      cyan   : cssVar('--cyan'),
      amber  : cssVar('--amber'),
      purple : cssVar('--purple'),
      green  : cssVar('--green'),
      red    : cssVar('--red'),
      text   : cssVar('--text-secondary'),
      grid   : cssVar('--border'),
      bg     : cssVar('--bg-surface'),
    };
  }

  /* ======================================================================
     Solver page — value comparison bar chart
     ====================================================================== */

  function render(data) {
    renderBarChart(data);
    renderRadarChart(data);
  }

  function renderBarChart(data) {
    const ctx = document.getElementById('value-bar-chart');
    if (!ctx) return;

    if (barChart) barChart.destroy();

    const dp     = data.dp;
    const greedy = data.greedy;
    const clr    = themeColors();

    const labels  = ['DP (Optimal)', 'Greedy (Ratio)', 'Greedy (Value)', 'Greedy (Weight)'];
    const values  = [
      dp.optimal_value,
      greedy.ratio.optimal_value,
      greedy.value.optimal_value,
      greedy.weight.optimal_value,
    ];
    const colors  = [clr.cyan, clr.amber, clr.purple, clr.green];
    const opacity = values.map(v => v === dp.optimal_value ? '33' : '20');

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label          : 'Total Value',
          data           : values,
          backgroundColor: colors.map((c, i) => c + opacity[i]),
          borderColor    : colors,
          borderWidth    : 2,
          borderRadius   : 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v   = ctx.raw;
                const opt = dp.optimal_value;
                const eff = opt > 0 ? ` (${Math.round(v/opt*100)}% of optimal)` : '';
                return `Value: ${v}${eff}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: clr.text, font: { size: 11 } },
            grid : { color: clr.grid },
          },
          y: {
            beginAtZero: true,
            ticks: { color: clr.text, font: { size: 11 } },
            grid : { color: clr.grid },
          },
        },
        animation: { duration: 600, easing: 'easeOutCubic' },
      },
    });
  }

  function renderRadarChart(data) {
    const ctx = document.getElementById('radar-chart');
    if (!ctx) return;

    if (radarChart) radarChart.destroy();

    const dp     = data.dp;
    const clr    = themeColors();

    const maxVal   = dp.optimal_value || 1;
    const maxW     = data.capacity || 1;
    const maxTime  = Math.max(
      dp.time_ms,
      ...Object.values(data.greedy).map(g => g.time_ms)
    ) || 1;

    const normalize = (v, max) => Math.round((v / max) * 100);

    const datasets = [
      {
        label          : 'DP',
        data           : [
          normalize(dp.optimal_value, maxVal),
          100 - normalize(dp.time_ms, maxTime),      // invert: less time = better
          100,                                         // always optimal
          normalize(dp.total_weight, maxW),
          (dp.n_items + 1) * (data.capacity + 1) > 5000 ? 30 : 80, // scalability
        ],
        borderColor    : clr.cyan,
        backgroundColor: clr.cyan + '22',
        pointBackgroundColor: clr.cyan,
        borderWidth    : 2,
      },
      {
        label          : 'Greedy (Ratio)',
        data           : [
          normalize(data.greedy.ratio.optimal_value, maxVal),
          100 - normalize(data.greedy.ratio.time_ms, maxTime),
          data.greedy.ratio.efficiency_pct,
          normalize(data.greedy.ratio.total_weight, maxW),
          95,  // greedy is very scalable
        ],
        borderColor    : clr.amber,
        backgroundColor: clr.amber + '22',
        pointBackgroundColor: clr.amber,
        borderWidth    : 2,
      },
    ];

    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels  : ['Value', 'Speed', 'Accuracy', 'Weight Use', 'Scalability'],
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero       : true,
            max               : 100,
            ticks             : { display: false },
            grid              : { color: clr.grid },
            pointLabels       : { color: clr.text, font: { size: 11 } },
            angleLines        : { color: clr.grid },
          },
        },
        plugins: {
          legend: {
            labels: { color: clr.text, font: { size: 11 }, boxWidth: 12 },
          },
        },
        animation: { duration: 700, easing: 'easeOutCubic' },
      },
    });
  }

  /* ======================================================================
     Benchmark page
     ====================================================================== */

  let benchTimeChart  = null;
  let benchEffChart   = null;

  async function runBenchmark() {
    const maxN     = parseInt(document.getElementById('bench-n')?.value   || 30, 10);
    const maxCap   = parseInt(document.getElementById('bench-cap')?.value || 200, 10);
    const btn      = document.getElementById('bench-btn');

    if (btn) {
      btn.disabled    = true;
      btn.textContent = 'Running…';
    }

    try {
      const res  = await fetch('/api/benchmark', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ max_n: maxN, max_capacity: maxCap, steps: 14 }),
      });
      const data = await res.json();
      renderBenchCharts(data);
    } catch (e) {
      console.error(e);
      toast('Benchmark failed.', 'error');
    } finally {
      if (btn) {
        btn.disabled    = false;
        btn.textContent = '▶ Run Benchmark';
      }
    }
  }

  function renderBenchCharts(data) {
    const clr = themeColors();

    /* ---- Time chart ---- */
    const tCtx = document.getElementById('bench-time-chart');
    if (tCtx) {
      if (benchTimeChart) benchTimeChart.destroy();
      benchTimeChart = new Chart(tCtx, {
        type: 'line',
        data: {
          labels  : data.labels,
          datasets: [
            {
              label          : 'DP — O(n·W)',
              data           : data.dp_times,
              borderColor    : clr.cyan,
              backgroundColor: clr.cyan + '15',
              pointRadius    : 4,
              tension        : 0.3,
              fill           : true,
            },
            {
              label          : 'Greedy — O(n log n)',
              data           : data.greedy_times,
              borderColor    : clr.amber,
              backgroundColor: clr.amber + '15',
              pointRadius    : 4,
              tension        : 0.3,
              fill           : true,
            },
          ],
        },
        options: benchOptions(clr, 'Number of Items', 'Time (ms)'),
      });
    }

    /* ---- Efficiency chart ---- */
    const eCtx = document.getElementById('bench-eff-chart');
    if (eCtx) {
      if (benchEffChart) benchEffChart.destroy();
      benchEffChart = new Chart(eCtx, {
        type: 'line',
        data: {
          labels  : data.labels,
          datasets: [{
            label          : 'Greedy Accuracy (% of DP optimal)',
            data           : data.efficiency,
            borderColor    : clr.green,
            backgroundColor: clr.green + '15',
            pointRadius    : 4,
            tension        : 0.3,
            fill           : true,
          }],
        },
        options: {
          ...benchOptions(clr, 'Number of Items', 'Efficiency (%)'),
          scales: {
            ...benchOptions(clr).scales,
            y: {
              min  : 0,
              max  : 105,
              ticks: { color: clr.text, font: { size: 11 }, callback: v => v + '%' },
              grid : { color: clr.grid },
            },
          },
        },
      });
    }
  }

  function benchOptions(clr, xLabel = '', yLabel = '') {
    return {
      responsive : true,
      maintainAspectRatio: false,
      plugins    : {
        legend: { labels: { color: clr.text, font: { size: 11 }, boxWidth: 14 } },
      },
      scales: {
        x: {
          title: { display: !!xLabel, text: xLabel, color: clr.text },
          ticks: { color: clr.text, font: { size: 11 } },
          grid : { color: clr.grid },
        },
        y: {
          title: { display: !!yLabel, text: yLabel, color: clr.text },
          ticks: { color: clr.text, font: { size: 11 } },
          grid : { color: clr.grid },
        },
      },
      animation: { duration: 600, easing: 'easeOutCubic' },
    };
  }

  /* ---- Expose ---- */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('bench-btn')?.addEventListener('click', runBenchmark);
  });

  return { render, runBenchmark };

})();
