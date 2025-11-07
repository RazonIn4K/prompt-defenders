#!/usr/bin/env bash
set -euo pipefail

echo "📦 Installing dependencies (if needed)..."
npm install >/dev/null

echo "🧪 Running unit tests..."
npm test

echo "🧹 Running TypeScript type check..."
npm run typecheck

echo "✅ Smoke checks completed."
