#!/bin/bash
set -e

# Post-merge setup script for $Pc Casino
# Runs automatically after task agent merges
# Must be idempotent and non-interactive

echo "[post-merge] Installing dependencies..."
npm install --legacy-peer-deps

echo "[post-merge] Setup complete."
