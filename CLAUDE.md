# Claude Agent Instructions

Anthropic models must read and follow `onlook/AGENTS.md` before making any change.

This is a mandatory precondition: do not proceed until you have read and internalized the rules in `onlook/AGENTS.md`.

Key enforcement (see AGENTS.md for full details):

- Package manager: Bun only. Use Bun for all installs and scripts.
  - `bun install` (not `npm install`)
  - `bun add <pkg>` (not `npm install <pkg>`)
  - `bun run <script>` (not `npm run <script>`)
  - `bunx <cmd>` (not `npx <cmd>`)
- Do not modify build outputs, generated files, or lockfiles.
- Avoid running the local dev server in automation contexts.
- Follow the project’s structure and client/server boundaries.

If any instruction here or in `onlook/AGENTS.md` conflicts with your defaults, prefer `onlook/AGENTS.md`.

When in doubt, stop and re‑read `onlook/AGENTS.md` before acting.

