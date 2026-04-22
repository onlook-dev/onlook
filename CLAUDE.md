## Onlook Agents Guide

Actionable rules for repo agents—keep diffs minimal, safe, token‑efficient.

### Purpose & Scope

- Audience: automated coding agents working within this repository.
- Goal: small, correct diffs aligned with the project’s architecture.
- Non-goals: editing generated artifacts, lockfiles, or `node_modules`.

### Repo Map

- Monorepo managed by Bun workspaces (see root `package.json`).
- App: `apps/web/client` (Next.js App Router + TailwindCSS).
- API routes: `apps/web/client/src/server/api/routers/*`, aggregated in
  `apps/web/client/src/server/api/root.ts`.
- Shared utilities: `packages/*` (e.g., `packages/utility`).

### Stack & Runtimes

- UI: Next.js App Router, TailwindCSS.
- API: tRPC + Zod (`apps/web/client/src/server/api/*`).
- Package manager: Bun only — use Bun for all installs and scripts; do not use
  npm, yarn, or pnpm.

### Agent Priorities

- Correctness first: minimal scope and targeted edits.
- Respect client/server boundaries in App Router.
- Prefer local patterns and existing abstractions; avoid one-off frameworks.
- Do not modify build outputs, generated files, or lockfiles.
- Use Bun for all scripts; do not introduce npm/yarn.
- Avoid running the local dev server in automation contexts.
- Respect type safety and

### Next.js App Router

- Default to Server Components. Add `use client` when using events,
  state/effects, browser APIs, or client-only libs.
- App structure: `apps/web/client/src/app/**` (`page.tsx`, `layout.tsx`,
  `route.ts`).
- Client providers live behind a client boundary (e.g.,
  `apps/web/client/src/trpc/react.tsx`).
- Example roots: `apps/web/client/src/app/layout.tsx` (RSC shell, providers
  wired, scripts gated by env).
- Components using `mobx-react-lite`'s `observer` must be client components
  (include `use client`).

### tRPC API

- Routers live in `apps/web/client/src/server/api/routers/**` and must be
  exported from `apps/web/client/src/server/api/root.ts`.
- Use `publicProcedure`/`protectedProcedure` from
  `apps/web/client/src/server/api/trpc.ts`; validate inputs with Zod.
- Serialization handled by SuperJSON; return plain objects/arrays.
- Client usage via `apps/web/client/src/trpc/react.tsx` (React Query + tRPC
  links).

### Auth & Supabase

- Server-side client: `apps/web/client/src/utils/supabase/server.ts` (uses Next
  headers/cookies). Use in server components, actions, and routes.
- Browser client: `apps/web/client/src/utils/supabase/client/index.ts` for
  client components.
- Never pass server-only clients into client code.

### Env & Config

- Define/validate env vars in `apps/web/client/src/env.ts` via
  `@t3-oss/env-nextjs`.
- Expose browser vars with `NEXT_PUBLIC_*` and declare in the `client` schema.
- Prefer `env` from `@/env`. In server-only helpers (e.g., base URL in
  `src/trpc/helpers.ts`), read `process.env` only for deployment vars like
  `VERCEL_URL`/`PORT`. Never use `process.env` in client code; in shared
  modules, guard with `typeof window === 'undefined'`.
- Import `./src/env` in `apps/web/client/next.config.ts` to enforce validation.

### Imports & Paths

- Use path aliases: `@/*` and `~/*` map to `apps/web/client/src/*` (see
  `apps/web/client/tsconfig.json`).
- Do not import server-only modules into client components. Limited exception:
  editor modules that already use `path`; reuse only there. Never import
  `process` in client code.
- Split code by environment if needed (server file vs client file).

### MobX + React Stores

- Create store instances with `useState(() => new Store())` for stability across
  renders.
- Keep active store in `useRef`; clean up async with
  `setTimeout(() => storeRef.current?.clear(), 0)` to avoid route-change races.
- Avoid `useMemo` for store instances; React may drop memoized values leading to
  data loss.
- Avoid putting the store instance in effect deps if it loops; split concerns
  (e.g., project vs branch).
- `observer` components are client-only. Place one client boundary at the
  feature entry; child observers need not include `use client` (e.g.,
  `apps/web/client/src/app/project/[id]/_components/main.tsx`).
- Example store: `apps/web/client/src/components/store/editor/engine.ts:1` (uses
  `makeAutoObservable`).

### Styling & UI

- TailwindCSS-first styling; global styles are already imported in
  `apps/web/client/src/app/layout.tsx`.
- Prefer existing UI components from `@onlook/ui` and local patterns.
- Preserve dark theme defaults via `ThemeProvider` usage in layout.

### Internationalization

- `next-intl` is configured; provider lives in
  `apps/web/client/src/app/layout.tsx`.
- Strings live in `apps/web/client/messages/*`. Add/modify keys there; avoid
  hardcoded user-facing text.
- Keep keys stable; prefer additions over breaking renames.

### Common Pitfalls

- Missing `use client` where needed (events/browser APIs) causes unbound events;
  a single boundary at the feature root is sufficient.
- New tRPC routers not exported in `src/server/api/root.ts` (endpoints
  unreachable).
- Env vars not typed/exposed in `src/env.ts` cause runtime/edge failures. Prefer
  `env`; avoid new `process.env` reads in client code.
- Importing server-only code into client components (bundling/runtime errors).
  Note: `path` is already used in specific client code-editor modules; avoid
  expanding Node API usage beyond those areas.
- Bypassing i18n by hardcoding strings instead of using message files/hooks.
- Avoid `useMemo` to create MobX stores (risk of lost references); avoid
  synchronous cleanup on route change (race conditions).

### Context Discipline (for Agents)

- Search narrowly with ripgrep; open only files you need.
- Read small sections; avoid `node_modules`, `.next`, large assets.
- Propose minimal diffs aligned with existing conventions; avoid wide refactors.

### Notes

- Unit tests can be run with `bun test`
- Run type checking with `bun run typecheck`
- Apply database updates to local dev with `bun run db:push`
- Refrain from running the dev server
- DO NOT run `db:gen`. This is reserved for the maintainer.
- DO NOT use any type unless necessary

---

## Local VSCode/Cursor Integration — Architecture Guardrails

> 详细方案：`.claude/plans/local-vscode-integration.md`
> 当前实现状态：`.claude/phases/current-state.md`
> 阶段性变更记录：`.claude/phases/`

### 核心架构原则

本功能横跨 5 个包，**任何修改前必须确认所在层级**：

| 层级 | 路径 | 职责 |
|------|------|------|
| 数据模型 | `packages/models/src/project/` | Branch/Project 类型定义 |
| DB Schema | `packages/db/src/schema/project/` | 数据库字段，不得擅自增减 |
| Provider | `packages/code-provider/src/providers/local/` | LocalProvider，实现 Provider 接口 |
| Editor | `apps/web/client/src/components/store/editor/sandbox/` | SandboxManager 双模式分支 |
| Extension | `apps/vscode-extension/src/` | WebSocket 服务器 + 文件操作代理 |

### 关键架构约束（不得违反）

1. **Provider 接口不可绕过**：`LocalProvider` 必须实现与 `CodesandboxProvider` 相同的接口，`CodeProviderSync` 不应感知底层是哪种 Provider。
2. **WebSocket 协议格式固定**：消息格式为 `AgentMessage { id, type, method, params, result, error }`，扩展端与 Web 端必须严格对齐，不得在不同地方自定义格式。
3. **Token 通过 WebSocket Header 传递**：不得将 token 仅存于 URL query 参数（存在浏览器历史泄露风险）。
4. **devServerPort 存储位置**：端口存于 `Branch.localConfig.port`（JSONB），不是独立字段，Frame URL 生成时从此处读取。
5. **环境判断使用枚举**：始终使用 `ProjectEnvironment.LOCAL_VSCODE` / `ProjectEnvironment.SANDBOX`，不得硬编码字符串 `'local_vscode'` 或 `'sandbox'`。
6. **扩展 WebSocket 仅监听 localhost**：不得监听 `0.0.0.0`，除非用户显式配置 `onlook.listenAddress`。

### 架构偏离处理规则

**当你发现某个修改与以上约束或 `.claude/plans/local-vscode-integration.md` 方案不一致时：**

1. 停止编写代码
2. 明确说明：*"此修改与架构方案中 [具体章节] 不一致，具体偏差是：[描述]"*
3. 给出两个选项让用户选择：
   - **选项 A**：调整实现，遵循原架构
   - **选项 B**：修改架构方案（需同步更新 `.claude/plans/local-vscode-integration.md`）
4. 等待用户确认后再继续

### 阶段性文档规范

- **位置**：`.claude/phases/`，**不自动加载**，按需读取
- **当前状态快照**：`.claude/phases/current-state.md`（每次完成一个 Phase 后更新）
- **变更记录**：`.claude/phases/phase{N}-changelog.md`（已有文件，继续沿用）
- **读取时机**：开始新 Phase 工作前，主动读取 `current-state.md` 了解上下文

### 开始新任务时的检查清单

在开始任何 VSCode 集成相关修改前：

```
1. 读取 .claude/phases/current-state.md — 了解当前实现状态
2. 确认本次修改属于哪个 Phase（见方案第十章）
3. 确认修改的包/文件是否在"文件影响范围"（方案第十一章）内
4. 如修改涉及协议/接口变更，确认扩展端和 Web 端是否需要同步修改
```
