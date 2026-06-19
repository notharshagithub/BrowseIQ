#!/bin/bash
# ==========================================================
# BrowseIQ Web Interface Runner
# Launches the FastAPI web server for BrowseIQ.
# ==========================================================

echo "🚀 Starting BrowseIQ Web Interface Server..."
echo "🌐 Open your web browser at: http://127.0.0.1:8000"
python3 main.py "$@"
