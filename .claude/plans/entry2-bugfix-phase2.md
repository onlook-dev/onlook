# 入口 2 Bug 修复 Phase 2：4 个实测问题修复 + LocalConfig 设置 UI

> 日期：2026-04-16
> 状态：待确认
> 前置文档：`local-config-redesign.md`（Phase 1 已完成：数据模型变更、代码适配）

---

## 一、4 个 Bug 根因分析

### Bug 1：关闭浏览器端口未释放

**现象**：项目 A 通过插件进入 Onlook（端口 3001），关闭浏览器窗口，端口仍被占用。

**根因**：
- `SandboxManager.initLocal()` 注册了 `beforeunload` handler 调用 `provider.stopProject()`，但 `beforeunload` 是同步事件，浏览器在 handler 执行后立即销毁页面。`stopProject()` 发起异步 WebSocket 写入，但页面在消息刷出到网络前就死了。
- 扩展端 `ws.on('close')` 的 30 秒 `setTimeout` 确实会触发 `devServerManager.stopServer()`，但 30 秒太长——项目 B 在此窗口内就尝试启动了。

**修复方案**：
- 用 `navigator.sendBeacon` 替代 `beforeunload` 异步调用（sendBeacon 是 W3C 规定的 unload 清理机制）
- 扩展端新增 `/stop` HTTP 端点接收 sendBeacon 请求
- 将 WebSocket close 延迟从 30 秒降为 5 秒

---

### Bug 2：端口冲突报错不清晰

**现象**：端口被占用时，Web UI 收到的错误是 `[500] Dev server 意外退出，code: 1`，而非明确的端口冲突提示。

**根因**：
- `DevServerManager.startServer()` 先检查 `isPortAvailable(targetPort)`，再 `spawn()` 启动进程。但 `isPortAvailable()` 使用 `net.createServer().listen()` 绑定测试——在 macOS/Linux 上默认 `SO_REUSEADDR`，如果前一个进程处于 `TIME_WAIT` 状态，绑定测试误返回 `true`。
- 进程启动后实际绑定端口时失败，触发 `exit` 事件 `code: 1`，用户看到的是 "意外退出" 而非 "端口被占用"。

**修复方案**：
- `isPortAvailable()` 使用 `exclusive: true` 禁用 `SO_REUSEADDR`，避免 `TIME_WAIT` 误报
- 端口不可用时，抛出明确消息：`Port ${targetPort} is already in use by another process...`

---

### Bug 3：localConfig 为 null，无设置 UI

**现象**：通过插件打开项目后，数据库 `local_config` 为 null；无 UI 修改 devCommand/buildCommand/port。

**根因**：
- `useLocalAgentAutoConnect()` 在 `page.tsx` 中调用 `createProject()` 时未传 `localConfig`
- `DEFAULT_LOCAL_CONFIG` 在 models 中定义了但从未被任何创建流程引用
- 没有 Local Dev Server 设置面板

**修复方案**：
- 所有项目创建入口（`page.tsx`、`top-bar.tsx`、`create/manager.ts`）统一使用 `DEFAULT_LOCAL_CONFIG`
- Settings Modal 新增 "Local Dev Server" tab（仅对 local_vscode 项目可见）
- tab 中可修改 devCommand、buildCommand、port，保存后提示重启 Dev Server

---

### Bug 4：Toggle Terminal 无输出

**现象**：点击 Toggle Terminal 面板无任何内容。

**根因**：
- `onDidWriteTerminalData` 是 VSCode **proposed API**，不在 `@types/vscode` 稳定声明中
- 扩展 `package.json` 未声明 `"enabledApiProposals": ["terminalDataWriteEvent"]`
- `_window.onDidWriteTerminalData` 在运行时为 `undefined`——没有监听器被注册，没有数据事件产生
- 即使 proposed API 启用了，`LocalTerminal.open()` 只返回 ID，不建立 shell I/O 通道

**修复方案**（两路并行）：
- **快速路径**：将 DevServerManager 的 `ChildProcess` stdout/stderr 直接通过 `TERMINAL_OUTPUT` 事件推送，让 task session 能显示 Dev Server 日志
- **完整路径**：TerminalManager 用 `Pseudoterminal`（稳定 API）替代 `onDidWriteTerminalData`（proposed API），创建有 shell 的交互式终端

---

## 二、实施步骤

### Step 1：Dev Server 关闭机制修复（Bug 1）

**改动文件**：

1. `apps/vscode-extension/src/server/agent-server.ts`
   - `startServer()` 中 HTTP handler 新增 `/stop` 請求端点
   - `/stop` 接收 `projectPath` + `token`（Bearer header 或 query param），调用 `devServerManager.stopServer()`
   - WebSocket close 延迟从 30000 改为 5000

2. `apps/web/client/src/components/store/editor/sandbox/index.ts`
   - `beforeUnloadHandler` 改为 `navigator.sendBeacon` 向 `http://localhost:${port}/stop` 发送 POST
   - 需要访问当前连接的 port 和 token（从 session.provider.options 或单独存储）

**复杂度**：Medium

---

### Step 2：端口冲突检测加固（Bug 2）

**改动文件**：

1. `apps/vscode-extension/src/project/dev-server.ts`
   - `isPortAvailable()` 使用 `{ port, host: 'localhost', exclusive: true }` 避免 `SO_REUSEADDR`
   - 端口不可用时的错误消息改为用户友好提示

**复杂度**：Low

---

### Step 3：LocalConfig 默认值填充 + 设置 UI（Bug 3）

**改动文件**：

1. `apps/web/client/src/app/projects/page.tsx`
   - `createNewProject()` 传入 `localConfig: DEFAULT_LOCAL_CONFIG`

2. `apps/web/client/src/app/projects/_components/top-bar.tsx`
   - `handleStartLocalProject()` 使用 `DEFAULT_LOCAL_CONFIG` 常量替代硬编码

3. `apps/web/client/src/components/store/create/manager.ts`
   - `startCreateLocal()` 使用 `DEFAULT_LOCAL_CONFIG`

4. `apps/web/client/src/components/ui/settings-modal/helpers.tsx`
   - `SettingsTabValue` 新增 `LOCAL_DEV = 'local-dev'`

5. `apps/web/client/src/components/ui/settings-modal/local-dev/index.tsx`（新建）
   - observer 组件，表单含 devCommand、buildCommand、port
   - 初始值从 `activeBranch.localConfig ?? DEFAULT_LOCAL_CONFIG` 读取
   - 保存调用 `api.branch.update.mutate()`，成功后 `runInAction` 更新内存中的 `localConfig`
   - 保存后显示 "Restart Dev Server" 按钮

6. `apps/web/client/src/components/ui/settings-modal/with-project.tsx`
   - 条件渲染：`environment === LOCAL_VSCODE` 时添加 LOCAL_DEV tab

7. `apps/vscode-extension/src/server/protocol.ts`
   - `DevServerRestartParams` 新增可选 `devCommand`、`port`，确保重启时能传新配置

8. `apps/vscode-extension/src/project/dev-server.ts`
   - `restartServer()` 支持接收并转发新 devCommand/port

9. `packages/code-provider/src/providers/local/index.ts`
   - `LocalTask.restart()` 传递当前 `localConfig` 参数

**复杂度**：Medium-High

---

### Step 4：Terminal 输出修复（Bug 4）

**改动文件**：

1. `apps/vscode-extension/src/project/dev-server.ts`
   - `startServer()` 新增可选 `onOutput` callback
   - `devProcess.stdout`/`stderr` 的 `data` 事件调用此 callback

2. `apps/vscode-extension/src/server/agent-server.ts`
   - `DEV_SERVER_START` 分发时传入 output callback，callback 内调用 `broadcastEvent(TERMINAL_OUTPUT, ...)`

3. `apps/vscode-extension/src/project/terminal-manager.ts`
   - 删除 `_window.onDidWriteTerminalData`（proposed API）
   - 创建终端时使用 `Pseudoterminal` 实现，内部 spawn shell 进程（`/bin/sh` 或 `cmd.exe`），将 stdout 通过 `onDidWrite` emitter 推送到 VSCode Terminal UI 和 WebSocket

4. `packages/code-provider/src/providers/local/index.ts`
   - `LocalTask.onOutput()` 注册到 `terminalOutputCallbacks`（用固定 ID `'dev'`），使 task session 能接收 Dev Server 日志

**复杂度**：Medium

---

## 三、执行顺序

```
Step 1 (关闭机制) ──── Bug 1 修复
Step 2 (端口检测) ──── Bug 2 修复，独立
Step 3 (设置 UI)  ──── Bug 3 修复，最复杂
Step 4 (Terminal) ──── Bug 4 修复
```

建议顺序：**1 → 2 → 3 → 4**

---

## 四、风险

| 风险 | 概率 | 缓解 |
|------|------|------|
| `sendBeacon` 被 CORS 阻止 | 低 | 扩展 HTTP server 已设 `Access-Control-Allow-Origin: *` |
| `exclusive: true` 在某些 Node 版本不支持 | 低 | Node 18+ 全支持 |
| `Pseudoterminal` 不支持交互式 shell 需要额外代码 | 中 | 先实现 task session 的 stdout 推送（快速路径），交互终端后续迭代 |
| `branch.update` mutation 可能不含 `localConfig` 字段 | 中 | 需确认 Zod schema，手动扩展如需 |
| Settings tab 保存后 `activeBranch.localConfig` 不会自动更新 | 中 | 保存后手动 `runInAction` 更新内存值 |

---

## 五、验收标准

- [ ] 关闭浏览器 → 5 秒内扩展停止 Dev Server（sendBeacon 或 WS close timer）
- [ ] 端口被占用 → Web UI 显示 "Port XXXX is already in use..." 而非 "意外退出 code: 1"
- [ ] 插件创建项目 → `local_config` 不为 null，为 `DEFAULT_LOCAL_CONFIG`
- [ ] Settings Modal 有 "Local Dev Server" tab，可修改 devCommand/buildCommand/port
- [ ] 保存设置 → 点击重启 → Dev Server 使用新配置启动
- [ ] Toggle Terminal → Task session 显示 Dev Server 日志输出