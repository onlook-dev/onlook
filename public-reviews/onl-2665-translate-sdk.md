# Translation command dependency review

ONL-2665 adds `bun run translate`, which calls the Anthropic API to translate
the English catalog. It adds `@anthropic-ai/sdk` 0.115.0 as an exact root
development dependency.

That version was already resolved in `bun.lock` through the Claude Agent SDK,
so the lockfile gains only the root declaration: no new package, version,
license text or required attribution enters the tree. The package declares
MIT, and its LICENSE carries the MIT grant (Copyright 2023 Anthropic, PBC).

Studio does not import it or distribute it: only the translate script under
`scripts/` uses it. Notices and
runtime dependencies are unchanged.

This record preserves dependency evidence, not publication approval.
