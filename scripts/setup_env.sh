#!/bin/bash


set -e  # Exit immediately if a command exits with a non-zero status

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_ENV_PATH="$ROOT_DIR/apps/web/client/.env"
SEED_ENV_PATH="$ROOT_DIR/packages/seed/.env"

echo "🔑 Onlook Environment Setup Script"
echo "=================================="

if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "🚀 Starting Supabase backend..."
echo "This might take a few minutes if it's your first time running Supabase."
echo "Please wait until the keys are displayed..."

TMP_OUTPUT=$(mktemp)

(cd "$ROOT_DIR" && bun backend:start | tee "$TMP_OUTPUT") &

BACKEND_PID=$!

extract_keys() {
  local output_file=$1
  local anon_key=$(grep -o "anon key: ey[A-Za-z0-9_-]\+" "$output_file" | sed 's/anon key: //')
  local service_role_key=$(grep -o "service_role key: ey[A-Za-z0-9_-]\+" "$output_file" | sed 's/service_role key: //')
  
  echo "$anon_key:$service_role_key"
}

echo "Waiting for Supabase to initialize and display the keys..."
KEYS=""
TIMEOUT=120  # Wait up to 2 minutes
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ] && [ -z "$KEYS" ]; do
  KEYS=$(extract_keys "$TMP_OUTPUT")
  if [ -n "$KEYS" ]; then
    break
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

kill $BACKEND_PID > /dev/null 2>&1 || true

if [ -z "$KEYS" ]; then
  echo "❌ Failed to extract Supabase keys within the timeout period."
  echo "Please run 'bun backend:start' manually and check the output for the anon key and service role key."
  rm "$TMP_OUTPUT"
  exit 1
fi

ANON_KEY=$(echo "$KEYS" | cut -d':' -f1)
SERVICE_ROLE_KEY=$(echo "$KEYS" | cut -d':' -f2)

echo "✅ Successfully extracted Supabase keys."

read -p "Enter your Codesandbox API key (from https://codesandbox.io/api): " CSB_API_KEY
read -p "Enter your Anthropic API key (optional, from https://console.anthropic.com/settings/keys): " ANTHROPIC_API_KEY

echo "📝 Creating .env file for web client at $CLIENT_ENV_PATH"
cat > "$CLIENT_ENV_PATH" << EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY

SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

CSB_API_KEY=$CSB_API_KEY

ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
EOF

echo "📝 Creating .env file for seed package at $SEED_ENV_PATH"
cat > "$SEED_ENV_PATH" << EOF
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
EOF

echo "✅ Environment files created successfully!"
echo "You can now proceed with the following steps from the guide:"
echo "6. Initialize the database: bun db:push"
echo "7. Seed the database: bun seed"
echo "8. Run development server: bun dev"

rm "$TMP_OUTPUT"
