"""
run.py — Quick start entry point.

Usage:
    python run.py

Environment variables (optional):
    SECRET_KEY   — Flask secret key (auto-generated if not set)
    APP_PASSWORD — Login password (default: manoj)
    PORT         — Port to listen on (default: 5000)
"""

import os
from database.db import init_db
from app import app

if __name__ == '__main__':
    init_db()
    port  = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    print(f"\n  KnapsackLab — http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
