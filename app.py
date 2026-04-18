"""
0/1 Knapsack Problem Solver
Greedy vs Dynamic Programming — Side-by-Side Comparison

Version : 1.0.0

Entry point for the Flask application. Handles routing, session auth,
and wires together the algorithm layer with the frontend.
"""

import os
import time
import json
import secrets
from datetime import datetime
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for,
)

from algorithms.knapsack_dp import solve_dp
from algorithms.knapsack_greedy import solve_greedy
from algorithms.complexity import run_benchmark
from database.db import init_db, save_problem, get_history, delete_problem, get_problem_by_id

# ---------------------------------------------------------------------------
# App bootstrap
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

# Single shared password — change via env var in production
APP_PASSWORD = os.environ.get("APP_PASSWORD", "manoj")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def login_required(f):
    """Decorator that redirects unauthenticated users to /login."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        pwd = request.form.get("password", "")
        if pwd == APP_PASSWORD:
            session["logged_in"] = True
            session.permanent = False          # session cookie only
            return redirect(url_for("index"))
        error = "Wrong password — try again."
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
@login_required
def index():
    return render_template("index.html")


@app.route("/history")
@login_required
def history():
    problems = get_history()
    return render_template("history.html", problems=problems)


@app.route("/benchmark")
@login_required
def benchmark_page():
    return render_template("benchmark.html")


# ---------------------------------------------------------------------------
# API — solver
# ---------------------------------------------------------------------------

@app.route("/api/solve", methods=["POST"])
@login_required
def api_solve():
    """
    Accepts a JSON payload: { items: [{name, weight, value}], capacity: int }
    Returns DP result + all three greedy strategy results + timing data.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No JSON body received."}), 400

    items    = data.get("items", [])
    capacity = int(data.get("capacity", 0))

    if not items:
        return jsonify({"error": "Provide at least one item."}), 400
    if capacity <= 0:
        return jsonify({"error": "Capacity must be a positive integer."}), 400
    if len(items) > 25:
        return jsonify({"error": "Max 25 items for table visualization."}), 400

    # --- Dynamic Programming ---
    t0        = time.perf_counter()
    dp_result = solve_dp(items, capacity)
    dp_ms     = round((time.perf_counter() - t0) * 1000, 4)

    # --- Greedy (three strategies) ---
    greedy_results = {}
    for strategy in ("ratio", "value", "weight"):
        t0 = time.perf_counter()
        greedy_results[strategy] = solve_greedy(items, capacity, strategy)
        greedy_results[strategy]["time_ms"] = round(
            (time.perf_counter() - t0) * 1000, 4
        )

    return jsonify({
        "dp": {**dp_result, "time_ms": dp_ms},
        "greedy": greedy_results,
        "capacity": capacity,
        "item_count": len(items),
    })


# ---------------------------------------------------------------------------
# API — history / persistence
# ---------------------------------------------------------------------------

@app.route("/api/save", methods=["POST"])
@login_required
def api_save():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Empty body"}), 400

    problem_id = save_problem(
        name       = data.get("name") or f"Problem @ {datetime.now().strftime('%d %b %H:%M')}",
        items      = data["items"],
        capacity   = data["capacity"],
        dp_result  = data["dp_result"],
        greedy_result = data["greedy_result"],
    )
    return jsonify({"id": problem_id, "message": "Saved."})


@app.route("/api/history")
@login_required
def api_history():
    return jsonify(get_history())


@app.route("/api/history/<int:pid>", methods=["DELETE"])
@login_required
def api_delete(pid):
    delete_problem(pid)
    return jsonify({"message": "Deleted."})


@app.route("/api/history/<int:pid>")
@login_required
def api_get_problem(pid):
    prob = get_problem_by_id(pid)
    if prob:
        return jsonify(prob)
    return jsonify({"error": "Not found."}), 404


# ---------------------------------------------------------------------------
# API — benchmark
# ---------------------------------------------------------------------------

@app.route("/api/benchmark", methods=["POST"])
@login_required
def api_benchmark():
    data     = request.get_json(silent=True) or {}
    results  = run_benchmark(
        max_n        = int(data.get("max_n", 30)),
        max_capacity = int(data.get("max_capacity", 200)),
        steps        = int(data.get("steps", 12)),
    )
    return jsonify(results)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
