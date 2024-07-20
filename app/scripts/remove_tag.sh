# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Remove tag locally
git tag -d v$VERSION

# Remove tag remotely
git push origin :refs/tags/v$VERSION