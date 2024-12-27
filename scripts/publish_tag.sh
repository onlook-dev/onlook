# Get the version from package.json
VERSION=$(node -p "require('./apps/studio/package.json').version")

# Add all changes to the staging area
git add .

# Commit changes with a message
git commit -m "Publish version v$VERSION"

# Create an annotated tag
git tag -a v$VERSION -m "Version $VERSION"

# Push the tag to the remote repository
git push --follow-tags origin HEAD
