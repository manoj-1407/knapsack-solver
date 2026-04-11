"""
algorithms/complexity.py

Empirical complexity benchmarking.

Generates random Knapsack instances of increasing size and measures
the actual wall-clock time for both DP and the best greedy strategy.

The results feed the benchmark chart on the frontend, giving students
a concrete, data-backed look at the O(n·W) vs O(n log n) growth curves.
"""

from __future__ import annotations

import random
import time
from typing import Any

from algorithms.knapsack_dp import solve_dp
from algorithms.knapsack_greedy import solve_greedy


def _random_items(n: int, max_weight: int = 20, max_value: int = 100) -> list[dict]:
    """Generate n random knapsack items with reproducible seeds."""
    rng = random.Random(n * 31 + max_weight)   # deterministic per (n, capacity)
    return [
        {
            "name"   : f"Item-{i + 1}",
            "weight" : rng.randint(1, max_weight),
            "value"  : rng.randint(1, max_value),
        }
        for i in range(n)
    ]


def _time_fn(fn, *args, repeats: int = 3) -> float:
    """
    Run fn(*args) `repeats` times and return the *minimum* elapsed ms.
    Using min (not mean) is a standard micro-benchmark practice — it
    removes OS scheduling noise from measurements.
    """
    times = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        fn(*args)
        times.append((time.perf_counter() - t0) * 1000)
    return round(min(times), 4)


def run_benchmark(
    max_n       : int = 30,
    max_capacity: int = 200,
    steps       : int = 12,
) -> dict[str, Any]:
    """
    Run timed benchmarks across a range of problem sizes.

    Args:
        max_n        : largest number of items to test
        max_capacity : knapsack capacity (held constant across sizes)
        steps        : how many data points to generate

    Returns:
        {
          "labels"   : [n values tested],
          "dp_times" : [ms per n],
          "greedy_times": [ms per n],
          "dp_values"   : [optimal values],
          "greedy_values": [greedy values],
          "efficiency"  : [greedy/dp * 100 per n],
        }
    """

    # Spread n values evenly from 1 to max_n
    if steps >= max_n:
        n_values = list(range(1, max_n + 1))
    else:
        step     = max(1, max_n // steps)
        n_values = list(range(1, max_n + 1, step))
        if n_values[-1] != max_n:
            n_values.append(max_n)

    labels        : list[int]   = []
    dp_times      : list[float] = []
    greedy_times  : list[float] = []
    dp_values     : list[int]   = []
    greedy_values : list[int]   = []
    efficiency    : list[float] = []

    for n in n_values:
        items = _random_items(n)

        dp_ms     = _time_fn(solve_dp, items, max_capacity)
        greedy_ms = _time_fn(solve_greedy, items, max_capacity, "ratio")

        dp_val     = solve_dp(items, max_capacity)["optimal_value"]
        greedy_val = solve_greedy(items, max_capacity, "ratio")["optimal_value"]

        eff = round((greedy_val / dp_val * 100) if dp_val > 0 else 100.0, 2)

        labels.append(n)
        dp_times.append(dp_ms)
        greedy_times.append(greedy_ms)
        dp_values.append(dp_val)
        greedy_values.append(greedy_val)
        efficiency.append(eff)

    return {
        "labels"        : labels,
        "dp_times"      : dp_times,
        "greedy_times"  : greedy_times,
        "dp_values"     : dp_values,
        "greedy_values" : greedy_values,
        "efficiency"    : efficiency,
        "capacity"      : max_capacity,
    }
