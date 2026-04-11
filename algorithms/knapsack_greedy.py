"""
algorithms/knapsack_greedy.py

Greedy heuristics for the 0/1 Knapsack problem.

Three strategies are provided so the UI can compare them:

    "ratio"  — sort by value-to-weight ratio (best greedy approximation)
    "value"  — sort by value descending (maximise immediate value)
    "weight" — sort by weight ascending (fit as many items as possible)

Note: ALL greedy approaches are heuristics — they are NOT guaranteed
      to find the optimal solution. That's the entire point of the
      Greedy vs DP comparison this tool demonstrates.

Time complexity  : O(n log n)  — dominated by the sort
Space complexity : O(n)
"""

from __future__ import annotations
from typing import Any


# ---------------------------------------------------------------------------
# Sort key factories
# ---------------------------------------------------------------------------

def _sort_key(strategy: str):
    """Return a sort-key function for the given strategy."""
    if strategy == "ratio":
        # Higher ratio first; avoid division by zero
        return lambda it: it["value"] / max(it["weight"], 1e-9)
    if strategy == "value":
        return lambda it: it["value"]
    if strategy == "weight":
        # Lower weight first — we want to *maximise* fit, so reverse=False
        # but we still negate so we can always use reverse=True in sorted()
        return lambda it: -it["weight"]
    raise ValueError(f"Unknown strategy: {strategy!r}")


STRATEGY_LABELS = {
    "ratio" : "Highest Value/Weight Ratio",
    "value" : "Highest Value First",
    "weight": "Lowest Weight First",
}


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------

def solve_greedy(
    items: list[dict],
    capacity: int,
    strategy: str = "ratio",
) -> dict[str, Any]:
    """
    Greedy 0/1 Knapsack approximation.

    Args:
        items    : list of {"name": str, "weight": int, "value": int}
        capacity : knapsack capacity
        strategy : "ratio" | "value" | "weight"

    Returns a dict with:
        strategy       : str            — strategy used
        strategy_label : str            — human-readable label
        optimal_value  : int            — total value of selected items
        total_weight   : int            — total weight
        selected       : list[dict]     — selected items (with original index)
        rejected       : list[dict]     — items that didn't fit
        steps          : list[dict]     — decision log for animation
        efficiency_pct : float | None   — value% vs DP optimal (set later)
    """

    n = len(items)

    # Annotate original indices before sorting
    annotated = [
        {**items[i], "original_index": i}
        for i in range(n)
    ]

    # Sort descending by chosen criterion
    # (weight strategy is "lowest first" — we used negation in _sort_key)
    key_fn    = _sort_key(strategy)
    sorted_items = sorted(annotated, key=key_fn, reverse=True)

    # Greedy pass
    remaining  = capacity
    selected   : list[dict] = []
    rejected   : list[dict] = []
    steps      : list[dict] = []

    for item in sorted_items:
        w = int(item["weight"])
        v = int(item["value"])

        if w <= remaining:
            # Take it
            selected.append(item)
            remaining -= w
            steps.append({
                "item"      : item["name"],
                "weight"    : w,
                "value"     : v,
                "ratio"     : round(v / max(w, 1), 4),
                "action"    : "take",
                "remaining" : remaining,
                "reason"    : f"Fits (remaining capacity: {remaining + w} → {remaining})",
            })
        else:
            # Skip it — it doesn't fit (0/1, no fractional allowed)
            rejected.append(item)
            steps.append({
                "item"      : item["name"],
                "weight"    : w,
                "value"     : v,
                "ratio"     : round(v / max(w, 1), 4),
                "action"    : "skip",
                "remaining" : remaining,
                "reason"    : f"Too heavy (needs {w}, only {remaining} left)",
            })

    total_value  = sum(int(it["value"])  for it in selected)
    total_weight = sum(int(it["weight"]) for it in selected)

    return {
        "strategy"       : strategy,
        "strategy_label" : STRATEGY_LABELS[strategy],
        "optimal_value"  : total_value,
        "total_weight"   : total_weight,
        "selected"       : selected,
        "rejected"       : rejected,
        "steps"          : steps,
        "efficiency_pct" : None,   # caller fills this in after DP result
    }
