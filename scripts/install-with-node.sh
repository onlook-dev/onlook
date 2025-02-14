#!/bin/bash
# Set Node.js version for native module compilation
. ~/.nvm/nvm.sh
nvm install 18.17.0
nvm use 18.17.0

# Run bun install
bun install "$@"
