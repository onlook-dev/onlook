# PR #3077 – Platform Extensions Mega-PR Breakdown

This document explains everything bundled into PR #3077 (“Adding missing features that are not selected on the readme.md”), why it is currently difficult to review, and how it can be split into smaller, reviewer-friendly PRs per @Kitenite’s guidance.

---

## 1. High-Level Summary

The PR attempts to add **seven major feature areas** plus supporting database migrations and routers in a single change set (~13k additions, 66 files touched). Each feature is valuable, but reviewing all of them at once is burdensome. The goal of this document is to identify clear seams so we can submit focused PRs that are easier to test and merge.

| Feature Area | Description | Key Paths | Status |
|--------------|-------------|-----------|--------|
| Database schema | Adds assets/comments/figma/github/mcp tables, RLS policies, FK fixes | `apps/backend/supabase/migrations/0020_*`, `0021_*` | ✅ Complete |
| Figma integration | OAuth, file import, asset extraction, component conversion, design tokens | `packages/platform-extensions/src/figma/*`, `apps/web/client/src/server/api/routers/figma.ts` | ✅ Complete (requires FIGMA env vars) |
| GitHub integration | Repo management, PR/branch automation | `packages/platform-extensions/src/github/*`, router wiring | ✅ Complete |
| Asset management | Upload/organize/optimize assets, import statement generation | `packages/platform-extensions/src/assets/*`, routers | ✅ Complete (uses in-memory storage placeholder) |
| Comments system | Threaded comments, mentions, replies, resolution | `packages/platform-extensions/src/comments/*`, `apps/web/client/src/server/api/routers/comments.ts` | ✅ Complete (in-memory DB stub) |
| Components panel | Search/filter/drag components, custom components | `packages/platform-extensions/src/components/*`, router | ✅ Complete |
| MCP integration | MCP server configs, tool execution | `packages/platform-extensions/src/mcp/*`, tests | ✅ Minimal in-memory implementation + tests |
| Universal services | Framework/style detection & generation | `packages/platform-extensions/src/universal/*` | ⚠️ Still stubs (throws “Not implemented”) |
| Token storage | Placeholder database-backed storage | `packages/platform-extensions/src/figma/token-storage.ts` | ⚠️ DB storage left unimplemented (explicit TODO) |

Supporting updates:
* New TRPC routers for figma/assets/comments/components.
* Env var validation for FIGMA client credentials.
* Barrel (`packages/platform-extensions/src/index.ts`) exporting new modules.

---

## 2. Recommended Split Strategy

To align with maintainer feedback (“break features out into smaller, separate PRs”), the work can be decomposed as follows. Each PR is self-contained, builds on previously merged pieces, and should be reviewable in ≤30 minutes.

1. **Foundation – Database Schema & Policies**
   * Files: `apps/backend/supabase/migrations/0020_*.sql`, `0021_*`, `_journal.json`
   * Includes tables, RLS policies, FK cascade fix, migration journal sync.

2. **Figma Integration**
   * Files: `packages/platform-extensions/src/figma/*`, `apps/web/client/src/server/api/routers/figma.ts`, env typings.
   * Covers auth, file import, assets, component conversion, design tokens, token storage (with clear TODO for secure DB storage).

3. **Asset Management Service**
   * Files: `packages/platform-extensions/src/assets/*`, `apps/web/client/src/server/api/routers/assets.ts`.
   * Focused on upload/optimization/import generation. Can keep in-memory storage for now with TODO for persistence.

4. **Comments Service**
   * Files: `packages/platform-extensions/src/comments/*`, router, types.
   * Includes mention processing and thread resolution logic.

5. **Components Panel Service**
   * Files: `packages/platform-extensions/src/components/*`, router.
   * Search/filter/drag-drop infrastructure.

6. **GitHub Integration Service**
   * Files: `packages/platform-extensions/src/github/*`, router wiring.
   * Repo connection, branch/PR automation.

7. **MCP Integration + Tests**
   * Files: `packages/platform-extensions/src/mcp/*` (service + tests).
   * Lightweight in-memory implementation with test coverage; future work can connect real MCP servers.

8. **Universal Services (follow-up)**
   * Files: `packages/platform-extensions/src/universal/*`.
   * Currently placeholders. After other PRs land, implement these or guard them properly in a dedicated PR.

Each follow-up PR can reference this summary for context and explicitly state dependencies (e.g., “requires migrations from PR X”).

---

## 3. Current Status / Outstanding Items

* **Build correctness**: Passes after locking Zod to `^3.23.0` and regenerating `bun.lock`.
* **Critical CodeRabbit issues**: RLS policies, FK cascade, comment type, Figma OAuth, style props, token naming, MCP stubs – all addressed in latest commits.
* **Remaining TODOs** (intentional stubs):
  * `UniversalProjectService` + `UniversalStyleService` methods.
  * `DatabaseTokenStorage` (Figma tokens) – currently throws until DB schema defined.
* **Deployment checks**: Vercel preview requires maintainer approval; no code changes pending here.
* **Testing**: Added unit tests for MCP service; other services currently rely on integration testing in-app. Future PRs can add targeted tests per feature as needed.

---

## 4. Proposed Next Steps

1. **Discuss priority with @drfarrell** – identify which feature area the maintainers want reviewed first (e.g., migrations + Figma only).
2. **Close mega-PR or convert into tracking PR** – submit focused PR(s) following the order above.
3. **Implement/guard the remaining stubs** in follow-up work once foundations merge.
4. **Document deployment requirements** (Figma env vars, migration commands) in README when shipping individual features.

---

## 5. Maintainer FAQ

**Q: Why not keep everything in one PR?**  
A: Review surface is too large (13k LOC). Smaller PRs reduce review time, risk, and merge conflicts.

**Q: Are there hidden blockers?**  
A: No build blockers remain. Stubs are clearly marked and won’t execute unless wired in future PRs.

**Q: Do features depend on each other?**  
A: They share the new schema but are otherwise independent. That’s why the schema PR should land first.

**Q: What about production readiness?**  
A: Services currently use in-memory storage or stubs where infrastructure isn’t defined. Follow-up work will replace these with real persistence once the maintainers confirm the direction.

