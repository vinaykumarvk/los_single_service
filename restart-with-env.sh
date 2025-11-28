#!/bin/bash
# Restart monolith with environment variables
cd /Users/n15318/LoS

# Load .env file
export $(grep -v '^#' .env | xargs)

# Also try to get from shell environment (in case user set them there)
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "✅ Found SUPABASE_SERVICE_ROLE_KEY in environment"
fi

# Start service
cd services/monolith
pnpm dev > ../../logs/monolith.log 2>&1 &
echo $! > ../../.runtime/monolith-pid.txt
echo "Service started. PID: $(cat ../../.runtime/monolith-pid.txt)"
echo "Check logs: tail -f ../../logs/monolith.log"
