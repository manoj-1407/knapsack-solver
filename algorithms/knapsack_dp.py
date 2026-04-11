"""
algorithms/knapsack_dp.py

Pure 0/1 Knapsack solver using bottom-up Dynamic Programming.

Records the complete DP table and backtracking path so the frontend
can animate the exact cell-fill order and highlight selected items.

Time complexity  : O(n × W)
Space complexity : O(n × W)  — storing the full 2D table for visualization
"""

from __future__ import annotations
from typing import Any


def solve_dp(items: list[dict], capacity: int) -> dict[str, Any]:
    """
    Solve the 0/1 Knapsack problem with DP.

    Args:
        items    : list of {"name": str, "weight": int, "value": int}
        capacity : knapsack capacity (positive integer)

    Returns a dict with:
        optimal_value : int           — best total value
        selected      : list[dict]    — items chosen
        total_weight  : int           — weight of chosen items
        table         : list[list]    — full (n+1) × (W+1) DP table
        steps         : list[dict]    — each cell-fill recorded for animation
        backtrack_path: list[tuple]   — (row, col) cells traced during backtrack
    """

    n = len(items)
    W = capacity

    # Build DP table — (n+1) rows × (W+1) cols, all zeros
    dp = [[0] * (W + 1) for _ in range(n + 1)]

    # steps log: every time we write a non-trivial cell we record it
    steps: list[dict] = []

    # -----------------------------------------------------------------------
    # Fill the DP table
    # -----------------------------------------------------------------------
    for i in range(1, n + 1):
        item   = items[i - 1]
        w_i    = int(item["weight"])
        v_i    = int(item["value"])

        for w in range(W + 1):
            # Option 1: skip this item
            skip = dp[i - 1][w]

            # Option 2: take this item (only if it fits)
            take = 0
            if w_i <= w:
                take = dp[i - 1][w - w_i] + v_i

            dp[i][w] = max(skip, take)

            # Log the step so the animator knows what happened in this cell
            steps.append({
                "row"    : i,
                "col"    : w,
                "value"  : dp[i][w],
                "action" : "take" if (w_i <= w and take > skip) else "skip",
                "item_idx": i - 1,
            })

    optimal_value = dp[n][W]

    # -----------------------------------------------------------------------
    # Backtrack to find which items were selected
    # -----------------------------------------------------------------------
    backtrack_path: list[tuple[int, int]] = []
    selected: list[dict] = []

    w = W
    for i in range(n, 0, -1):
        backtrack_path.append((i, w))
        if dp[i][w] != dp[i - 1][w]:
            # This item was taken
            selected.append({**items[i - 1], "original_index": i - 1})
            w -= int(items[i - 1]["weight"])

    backtrack_path.append((0, w))  # final cell

    total_weight = sum(int(it["weight"]) for it in selected)

    return {
        "optimal_value" : optimal_value,
        "selected"      : selected,
        "total_weight"  : total_weight,
        "table"         : dp,
        "steps"         : steps,
        "backtrack_path": backtrack_path,
        "n_items"       : n,
        "capacity"      : W,
    }
