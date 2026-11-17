# Contributing to Onlook

## Report an issue

Use GitHub issues to report a bug or suggest an improvement. Search existing issues first. For a bug, include what you expected and what happened, the steps to reproduce it, your Onlook version and operating system, and a screenshot or recording if it helps. Leave out secrets and private project files.

To report a security problem, follow [SECURITY.md](SECURITY.md) instead.

## Build Onlook

[SOURCE_BUILD.md](SOURCE_BUILD.md) lists the tools you need and covers building, running and packaging Onlook on a Mac. [scripts/README.md](scripts/README.md) describes the commands that run the checks.

## Propose a change

For a larger change, open an issue to discuss it first. Keep a pull request to one change, say what problem it solves, and say how you checked it.

Before you open it:

- Run `bun run verify`. CI runs the same checks.
- If you add or update a dependency, regenerate the inventory and `NOTICE` as [compliance/README.md](compliance/README.md) describes. Only add material whose license allows it.
- Add a changeset with `bun run changeset`, choosing `@studio/app`: patch for a fix, minor for a feature, written in plain words for the people who use Onlook. For a change they won't see, run `bun run changeset --empty`. Every pull request needs a new changeset.

The code and writing conventions are in [CODING.md](CODING.md) and [WRITING.md](WRITING.md).
