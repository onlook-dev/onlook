#!/bin/bash

# Navigate to the studio app directory
cd apps/studio || exit 1

# Read the current version and increment patch version using Node.js
current_version=$(node -p "require('./package.json').version")
new_version=$(node -p "const v = '${current_version}'.split('.'); v[2] = parseInt(v[2]) + 1; v.join('.')")

# Update package.json with new version using temporary file
tmp_file=$(mktemp)
jq --arg version "$new_version" '.version = $version' package.json > "$tmp_file" && mv "$tmp_file" package.json

echo "Version updated from $current_version to $new_version"
