#!/bin/bash

# Determine platform and architecture
case "$(uname -s)" in
    Darwin)
        PLATFORM="darwin"
        ;;
    Linux)
        PLATFORM="linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        PLATFORM="win64"
        ;;
    *)
        echo "Unsupported platform"
        exit 1
        ;;
esac

case "$(uname -m)" in
    x86_64|amd64)
        ARCH="x64"
        ;;
    arm64|aarch64)
        ARCH="aarch64"
        ;;
    *)
        echo "Unsupported architecture"
        exit 1
        ;;
esac

# Set Bun version
BUN_VERSION="1.2.2"  # Update this as needed

# Set download URL based on platform
if [ "$PLATFORM" = "win64" ]; then
    FILENAME="bun-${PLATFORM}.zip"
else
    FILENAME="bun-${PLATFORM}-${ARCH}.zip"
fi
DOWNLOAD_URL="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${FILENAME}"

# Create resources directory if it doesn't exist
RESOURCES_DIR="apps/studio/resources/bun"
mkdir -p "$RESOURCES_DIR"

# Set up paths
if [ "$PLATFORM" = "win64" ]; then
    BUN_EXECUTABLE="${RESOURCES_DIR}/bun.exe"
else
    BUN_EXECUTABLE="${RESOURCES_DIR}/bun"
fi

# Check if Bun is already downloaded
if [ -f "$BUN_EXECUTABLE" ]; then
    echo "Bun is already downloaded at: ${BUN_EXECUTABLE}"
    exit 0
fi

# Download and extract Bun
echo "Downloading Bun from ${DOWNLOAD_URL}..."
curl -L "$DOWNLOAD_URL" -o "${RESOURCES_DIR}/bun.zip"

# Extract the binary
cd "$RESOURCES_DIR"
unzip -o bun.zip

# Move the binary to the correct location
if [ "$PLATFORM" = "win64" ]; then
    mv bun-*.exe bun.exe
else
    mv bun-*/bun bun
    chmod +x bun
fi

# Clean up
rm -rf bun.zip bun-*

echo "Bun has been downloaded and installed to: ${RESOURCES_DIR}"