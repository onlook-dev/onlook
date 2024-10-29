# Get the version from package.json
VERSION=$(node -p "require('./apps/studio/package').version")

# Remove tag locally
git tag -d v$VERSION

# Remove tag remotely
git push origin :refs/tags/v$VERSION