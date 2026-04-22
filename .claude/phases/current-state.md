# Local VSCode Integration — 当前实现状态

> 最后更新：2026-04-20
> 对应方案：`.claude/plans/local-vscode-integration.md`

---

## Phase 完成情况

| Phase | 名称 | 状态 | 备注 |
|-------|------|------|------|
| Phase 0 | 数据模型改造 | ✅ 完成 | |
| Phase 1 | VSCode 扩展核心 | ✅ 完成 | URI Handler createProject 入口1链路已完善 |
| Phase 2 | Dev Server 与项目管理 | ✅ 完成 | Dev Server 就绪检测已实现，端口冲突错误 UI 已完成 |
| Phase 3 | LocalProvider 实现 | ✅ 完成 | git 操作为桩代码 |
| Phase 4 | Web UI 改造 | ✅ 完成 | |
| Phase 5 | Cursor 内置浏览器适配 | ✅ 完成 | 已合并入口 2/3，统一降级链 |
| Phase 6 | 测试与优化 | ⬜ 未开始 | |

---

## 2026-04-20 变更记录

### 入口合并实现

**将入口 2（VSCode → 外部浏览器）和入口 3（Cursor → 内置浏览器）合并为单一入口**

改动文件：
- `apps/vscode-extension/src/browser/browser-detector.ts` — **新增**：浏览器能力检测模块
- `apps/vscode-extension/src/browser/ide-launcher.ts` — 重构：实现 Integrated → Simple → External 降级链
- `apps/vscode-extension/package.json` — 新增 `onlook.useIntegratedBrowser` 配置项
- `apps/vscode-extension/src/extension.ts` — 简化命令注册（移除 `onlook.openInBrowser`）

新特性：
- **VSCode 1.109+ Integrated Browser 支持**：完整 Chromium 浏览器体验（DevTools、登录支持）
- **Simple Browser iframe 降级**：旧版 VSCode 自动使用 Simple Browser
- **外部浏览器降级**：无内置浏览器时使用系统默认浏览器
- **用户配置项**：`onlook.useIntegratedBrowser`（默认 `true`），可选择外部浏览器

---

## 2026-04-17 变更记录

### 已修复 Bug
1. **`LocalTask.command` 硬编码** — 现在读取 `localConfig.devCommand ?? 'npm run dev'`
   - 文件：`packages/code-provider/src/providers/local/index.ts:799`

### 已完善功能
2. **IdeLauncher.openUrl()** — 新增直接打开 URL 的方法，区分 Cursor/VSCode 内置浏览器
   - 文件：`apps/vscode-extension/src/browser/ide-launcher.ts`

3. **入口 1 完整链路** — URI Handler createProject 成功后自动打开浏览器
   - 读取 `onlookUrl` 参数，拼接 `localAgent/token/workspacePath` 后调用 `ideLauncher.openUrl()`
   - 文件：`apps/vscode-extension/src/server/agent-server.ts`

4. **Dev Server 错误状态观察** — `SessionManager.devServerStatus` MobX observable
   - `onDevServerStatus` 回调写入此状态
   - `clear()` 时重置
   - 文件：`apps/web/client/src/components/store/editor/sandbox/session.ts`

5. **端口冲突错误传播** — `SandboxManager.startLocalDevServer()` catch block 写入 `session.devServerStatus`
   - 新增 `runInAction` import
   - 文件：`apps/web/client/src/components/store/editor/sandbox/index.ts`

6. **LocalDevTab 端口冲突错误 UI** — 订阅 `session.devServerStatus`，error 时显示错误横幅 + Restart 按钮
   - 文件：`apps/web/client/src/components/ui/settings-modal/local-dev/index.tsx`

7. **LocalProjectModal（入口1 Web UI）** — 新建"创建本地项目"弹窗，包含：
   - 项目名、父目录路径、devCommand、buildCommand、port 表单
   - 提交后：创建 DB 记录 → `crypto.randomUUID()` 生成 token → 构造并打开 `vscode://onlook.onlook-local?action=createProject&...` URI → 等待扩展回调
   - 文件：`apps/web/client/src/app/projects/_components/local-project-modal.tsx`
   
8. **TopBar 重构** — "Blank Local Project" 菜单项改为打开 `LocalProjectModal`，移除旧的内联创建逻辑
   - 文件：`apps/web/client/src/app/projects/_components/top-bar.tsx`

---

## 已知 Bug / 待修复

### 严重
1. **VSCode 扩展 URI Handler `createProject` 的本地路径选择 UI** — 当 URI 中无 `parentPath` 时，调用 `onlook.createProject` 命令让用户选择路径，但该命令完成后未打开浏览器（需要 `onlookUrl` 参数）
   - 下一步：Web 端的"创建本地项目"UI 需要提供 `parentPath` + `onlookUrl` 参数

2. **Web 端项目创建 UI 缺少本地路径输入** — 用户需要在 Web 创建表单输入本地项目路径(`parentPath`)，该字段和 `localConfig` 字段尚未集成到项目创建流程的 UI 中

### 中等
3. **Token 仍在 URL 参数中传递** — 安全风险（浏览器历史可见），应通过 WebSocket 握手 Header 传递
4. **TypeScript 类型退化** — `session.ts` 中有 `(this.provider as any).updateLocalConfig(newConfig)` 类型断言

### 低优先级
5. **`gitStatus()` 是桩代码** — 返回空数组，未实现
6. **HTTP 硬编码** — `view.tsx` Frame URL 强制使用 `http://`

---

## 下一步建议工作

优先顺序：
1. **入口 2（VSCode → 浏览器）** — 已有 `openOnlook()` 方法，需接入项目列表 UI（用 `useLocalAgentAutoConnect` hook 已基本处理）
2. **修复 Token 传递方式** — 从 URL 参数改为 WebSocket 握手 Header
3. **TypeScript 类型修复** — 移除 `session.ts` 中的 `(this.provider as any)` 断言

---

## 已实现的关键模块

### 数据模型（packages/models、packages/db）
- `ProjectEnvironment` 枚举：`SANDBOX` / `LOCAL_VSCODE`
- `Branch` 模型新增字段：`environment`、`localPath`、`localConfig`
- `LocalConfig` 接口：`{ port, devCommand, buildCommand }`
- DB Schema 和 Mapper 已更新

### LocalProvider（packages/code-provider/src/providers/local/）
- WebSocket 通信层，含自动重连（指数退避）
- 文件操作：read / write / rename / delete / mkdir / list
- 终端管理：`LocalTerminal`
- Dev Server 控制：`LocalTask`
- 文件监听：`LocalFileWatcher`
- `CodeProvider.Local` 枚举值已注册

### Web 前端（apps/web/client）
- `SandboxManager`：双环境分支（`initLocal` / `initSandbox`）
- `SessionManager`：`startLocal()` 方法，含 token 获取
- `FrameComponent`：`http://localhost:{port}` URL 适配
- `LocalDevTab` 设置页：devCommand / buildCommand / port 配置
- 项目卡片环境标识（Local / Cloud）
- `local-agent.ts`：`detectLocalAgent` / `scanLocalAgent` / `fetchLocalAgentToken`
- URL 参数解析：`localAgent`、`token`、`workspacePath`

### tRPC API（apps/web/client/src/server/api/routers/project/）
- `project.create`：支持 `environment`、`localPath`、`localConfig`
- `project.findByLocalPath`：按本地路径查询
- `branch.ts`：环境感知的完整 CRUD
- `fork.ts`：明确跳过无 `sandboxId` 的本地分支

### VSCode 扩展（apps/vscode-extension/src/）
- `extension.ts`：入口，状态栏指示器
- `AgentServer`：WebSocket 服务器基础架构
- `SecurityManager`：Token 验证框架
- `DevServerManager`：Dev Server 生命周期
- `TerminalManager`：终端管理
- `ProjectManager`：项目生命周期
- `FileOpsManager` / `FileWatcherManager`：文件操作
- `protocol.ts`：`AgentMessage` 消息格式定义

---

## 架构关键路径备忘

```
【入口1 完整流程】
Web 填写 localConfig + localPath → LocalProjectModal 打开
  → 创建 DB 记录 → crypto.randomUUID() 生成 token
  → 打开 URI: vscode://onlook.onlook-local?action=createProject&name=xxx&parentPath=xxx&token=xxx&onlookUrl=xxx
  → 扩展注册 token → 创建项目（create-next-app）
  → 打开浏览器: onlookUrl?localAgent=9527&token=xxx&workspacePath=/path/to/project
  → Web 读取 URL 参数 → LocalProvider 连接 WebSocket
  → 握手 → provider ready → startLocalDevServer()
  → devServer.start WebSocket 请求（携带 devCommand、port）
  → 扩展启动 dev server → devServer.status: running
  → Canvas iframe 加载 http://localhost:port
```

Token 存储位置：扩展侧 `SecurityManager` 内存 + 通过 WebSocket Header 验证（当前实现部分仍用 URL 参数，待修复）
