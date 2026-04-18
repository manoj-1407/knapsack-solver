# KnapsackLab — 0/1 Knapsack: Greedy vs Dynamic Programming

> Interactive educational tool for the 0/1 Knapsack problem. Compare exact Dynamic Programming with three Greedy heuristics using visualised computation, runtime benchmarks, and saved history.

---

## Screenshots

| Solver Page | Benchmark Page |
|---|---|
| DP table animation + greedy decision steps | Runtime & accuracy charts across problem sizes |

---

## Features

### Algorithms
- **Dynamic Programming** — guaranteed optimal solution, O(n·W)
- **Greedy (Ratio)** — sort by value/weight descending, O(n log n)
- **Greedy (Value)** — sort by value descending, O(n log n)
- **Greedy (Weight)** — sort by weight ascending, O(n log n)

### Visualisation
- Animated DP table fill — watch every cell get computed
- Step-through mode — click through each cell manually
- Animated backtrack path — see which items were selected
- Greedy decision cards — slide-in per decision with reason text
- Efficiency rings — how close each greedy approach gets to optimal

### Comparison
- Side-by-side value/weight/time metrics for all 4 algorithms
- Bar chart: value comparison
- Radar chart: multi-metric (value, speed, accuracy, scalability)

### Benchmarking
- Auto-generates random problem instances of increasing size
- Plots runtime (ms) vs problem size — see O(n·W) vs O(n log n) live
- Plots greedy accuracy vs problem size

### UX
- Dark / Light / System theme (persisted in localStorage, no FOUC)
- 4 preset problems including a "Greedy Fails" counterexample
- SQLite history — save, name, and revisit solved problems
- Password-protected (session auth)
- Toasts, inline editing, ratio auto-update

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.10+, Flask 3 |
| Database | SQLite (via stdlib `sqlite3`) |
| Frontend | Vanilla JS (no framework), Chart.js 4 |
| Styling | Pure CSS with CSS custom properties |
| Fonts | JetBrains Mono + Sora (Google Fonts) |

**Zero npm. Zero build step. Zero heavyweight dependencies.**

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/your-username/knapsack-solver.git
cd knapsack-solver
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run

```bash
python run.py
```

Open [http://localhost:5000](http://localhost:5000) — password: **manoj**

---

## Testing

### 1. Run the web app

Open `http://localhost:5000` and verify the login page accepts the password `manoj`.

### 2. Validate solver behavior

- Load a preset problem.
- Run the solver and compare Dynamic Programming with Greedy Ratio, Greedy Value, and Greedy Weight.
- Confirm the DP result always returns the highest value.

### 3. Verify benchmark results

- Open the benchmark page.
- Run the benchmark to see runtime and accuracy charts.
- Confirm the runtime curves reflect `O(n·W)` for DP and near `O(n log n)` for greedy.

### 4. Save and load history

- Solve a case and save it.
- Open the history page and reload the saved problem.
- Confirm the saved problem matches the original input and results.

---

## Project Structure

```
knapsack-solver/
│
├── app.py                     # Flask routes & auth
├── run.py                     # Startup entry point
├── requirements.txt
│
├── algorithms/
│   ├── knapsack_dp.py         # Bottom-up DP solver + table recorder
│   ├── knapsack_greedy.py     # Three greedy strategies + step logger
│   └── complexity.py          # Benchmarking across problem sizes
│
├── database/
│   ├── db.py                  # SQLite CRUD layer
│   └── knapsack.db            # Auto-created on first run
│
├── static/
│   ├── css/main.css           # Full design system (tokens, components)
│   ├── js/
│   │   ├── theme.js           # Dark/light/system theme manager
│   │   ├── solver.js          # Item table, API calls, results render
│   │   ├── visualizer.js      # DP table animation + greedy steps
│   │   ├── charts.js          # Chart.js wrappers (bar, radar, line)
│   │   └── toast.js           # Toast notification utility
│   └── img/favicon.svg
│
└── templates/
    ├── base.html              # Nav, topbar, theme toggle, footer
    ├── login.html             # Auth page
    ├── index.html             # Main solver page
    ├── benchmark.html         # Complexity benchmark page
    └── history.html           # Saved problems history
```

---

## Algorithm Deep Dive

### Why DP is Optimal but Greedy is Not

The 0/1 Knapsack problem has **overlapping subproblems** and **optimal substructure** — the two requirements for DP. Greedy approaches work perfectly on the **fractional** knapsack (where you can split items), but fail on 0/1 because taking the locally best item can block globally better combinations.

**Classic counterexample** (the "⚠️ Greedy Fails" preset):

| Item | Weight | Value | Ratio |
|------|--------|-------|-------|
| A    | 6      | 30    | 5.00  |
| B    | 5      | 25    | 5.00  |
| C    | 5      | 25    | 5.00  |

Capacity = 10.

- Greedy picks A (ratio = 5.0, fits). Remaining = 4. B and C don't fit. **Total = 30.**
- DP picks B + C (both fit: 5+5=10). **Total = 50.** Greedy is **40% suboptimal.**

### DP Recurrence

```
dp[i][w] = 0                                       if i = 0 or w = 0
         = dp[i-1][w]                              if weight[i] > w
         = max(dp[i-1][w], dp[i-1][w-w_i] + v_i)  otherwise
```

Time: O(n·W) | Space: O(n·W) for full table (required for visualisation)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_PASSWORD` | `manoj` | Login password |
| `SECRET_KEY` | (auto-generated) | Flask session key |
| `PORT` | `5000` | HTTP port |
| `FLASK_DEBUG` | `1` | Debug mode (set `0` for production) |

---

## License

MIT — free for academic and personal use.
