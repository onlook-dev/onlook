# Agent SDK 0.3.322 dependency review

Reviewed November 11, 2026 for ONL-3176. This is engineering evidence for the dependency delta, not publication clearance.

## Delta

`@anthropic-ai/claude-agent-sdk` moves from 0.3.284 to 0.3.322 in `apps/studio/package.json`, an exact pin as before. The lockfile changes only that package and its eight platform packages, each to 0.3.322. No package is added or removed, and no other version moves.

0.3.322 was published to npm on November 10, 2026, past the 30-hour release-age window when the lockfile was written. It bundles Claude Code 2.1.322, which adds Claude Fable 5.2 and Claude Haiku 5.5 over the previous pin.

## License and notice evidence

The inventory was regenerated with the commands in `compliance/README.md`. Every SDK entry keeps its declared license (`SEE LICENSE IN README.md` for the wrapper, `SEE LICENSE IN LICENSE.md` for each platform package), its `custom-or-compound-review` flag and its preserved text. The platform packages' license text is unchanged. The wrapper's preserved README text changes only in its Node.js floor badge (18 to 18.14) and its description of the `/core` entry point. The open distribution-rights item for the SDK in `compliance/README.md` stands unchanged.

## Advisories

The November 11 full-lockfile `bun audit --json` returned 61 advisory entries, one affecting a shipped package version, with exit 1; the same counts as the November 4 reassessment. None names the Agent SDK or its platform packages. `compliance/advisories.json` changes only in its scan metadata and the recorded SDK versions.
