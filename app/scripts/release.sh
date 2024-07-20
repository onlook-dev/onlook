# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create an annotated tag
git tag -a v$VERSION -m "Version $VERSION"

# Push the tag to the remote repository
git push origin v$VERSION