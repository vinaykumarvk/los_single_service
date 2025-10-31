#!/bin/bash
export DATABASE_URL="postgres://los:los@localhost:5432/los"
export CORS_ORIGIN="http://localhost:5000,http://localhost:5173"

echo "🚀 Starting all services with DATABASE_URL set..."
pnpm -w --parallel run dev
