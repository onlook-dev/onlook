# Repository Contribution Guidelines

This file contains instructions for automated agents interacting with the Onlook repository.

## Commit Requirements
- Run `bun format` to ensure consistent formatting.
- Run `bun lint` and `bun test` for any packages you modify. Tests may require running `bun install` first.
- Use clear, descriptive commit messages.

## Pull Request Guidelines
- Use `.github/pull_request_template.md` when creating PRs.
- Link related issues using GitHub keywords like `closes #123`.
- Provide a concise summary of the changes and any relevant testing steps.

## Additional Notes
- Follow the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [CONTRIBUTING.md](CONTRIBUTING.md) documents.
- If tests fail due to missing dependencies or environment limitations, note this in the PR description.
