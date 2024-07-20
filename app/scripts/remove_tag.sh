VERSION=$(node -p "require('./package.json').version")
git tag -d v$VERSION
git push origin :refs/tags/v$VERSION