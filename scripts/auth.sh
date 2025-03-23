# This is useful for those developing Onlook and need to authorize with the app

if [ -z "$1" ]; then
  echo "Usage: $0 <url>"
  echo "  Copy and paste the callback url from your browser to open Onlook"
  echo "  Example: $0 'https://localhost:3000/#access_token=123'"
  exit 1
fi

INPUT_URL=$1
FRAGMENT=$(echo $INPUT_URL | cut -d '#' -f 2)
SCHEME="onlook://auth"
DEEPLINK_URL="$SCHEME#$FRAGMENT"

node_modules/electron/dist/electron apps/studio $DEEPLINK_URL
