# Phase 2+3 修改文档：扩展端完整实现 + Web端 LocalProvider 集成

> 完成日期：2026-04-15
> 前置方案文档：`.claude/plans/local-vscode-integration.md`
> 前置 Phase：Phase 0（数据模型改造）、Phase 1（扩展端基础框架）

## 一、修改概览

Phase 2+3 的核心目标是完成扩展端的完整功能（Dev Server、终端、Preload Script 注入）以及 Web 端 LocalProvider 的真实 WebSocket 通信实现，使端到端链路贯通。

### 变更原则
- **协议对齐**：Web 端方法名、消息格式与扩展端 AgentMethods/AgentEvents 完全一致
- **复用现有**：LocalProvider 接入 CodeProviderSync 引擎，无需修改同步逻辑
- **优雅降级**：连接断开自动重连，扩展停用时清理所有资源

---

## 二、修改文件清单

### 扩展端（apps/vscode-extension）

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/project/dev-server.ts` | 新增 | DevServerManager：启动/停止/重启 Next.js 开发服务器，自动端口分配，30 秒超时检测 |
| `src/project/terminal-manager.ts` | 新增 | TerminalManager：创建/写入/终止 VSCode Terminal 实例 |
| `src/project/preload-inject.ts` | 新增 | PreloadScriptInjector：复制 onlook-preload-script.js 到 public/，注入 `<Script>` 到 layout.tsx |
| `src/project/project-manager.ts` | 修改 | 集成 PreloadScriptInjector，创建项目后异步注入 preload script |
| `src/server/agent-server.ts` | 修改 | 集成 DevServerManager 和 TerminalManager，dispatch 新增终端和 Dev Server 方法处理 |
| `src/extension.ts` | 修改 | 添加状态栏指示器、配置变更监听、更完善的 deactivate 清理 |

### Web 端（packages/code-provider）

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/providers/local/types.ts` | 修改 | 新增 `ConnectionState` 枚举和 `WsMessage` 接口 |
| `src/providers/local/index.ts` | 重写 | LocalProvider 完整 WebSocket 通信实现：连接管理、请求-响应、事件推送、自动重连 |

### Web 端（apps/web/client）

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/components/store/editor/sandbox/session.ts` | 修改 | 新增 `startLocal()` 方法，从 URL 参数读取连接信息创建 LocalProvider |
| `src/components/store/editor/sandbox/index.ts` | 修改 | `initLocal()` 调用 `session.start()` 启动 LocalProvider 连接 |

---

## 三、扩展端新增模块详情

### 3.1 DevServerManager

```typescript
class DevServerManager {
    // 核心方法
    startServer(params: { projectPath: string; port?: number }): Promise<{ port: number; status: string }>
    stopServer(params: { projectPath: string }): Promise<{ success: boolean }>
    restartServer(params: { projectPath: string }): Promise<{ port: number; status: string }>
    stopAll(): Promise<void>
    getStatus(projectPath: string): { status: DevServerStatus; port?: number } | null

    // 端口管理
    private allocatePort(preferred: number): Promise<number>  // 扫描可用端口
    private isPortAvailable(port: number): Promise<boolean>    // net.createServer 检测
}
```

**启动流程**：
1. 检查是否已有该项目的 dev server 在运行
2. 分配可用端口（从 preferred 开始扫描 100 个端口）
3. 使用 `spawn('npx', ['next', 'dev', '--port', port])` 启动
4. 监听 stdout/stderr 等待 `Ready` / `Local:` 标志
5. 30 秒超时未就绪则报错
6. 通过 eventCallback 推送 `devServer.status` 事件

**停止流程**：
1. 发送 SIGTERM
2. 5 秒后未退出发送 SIGKILL
3. 释放端口，清理记录

### 3.2 TerminalManager

```typescript
class TerminalManager {
    createTerminal(params: { cwd?: string }): Promise<{ terminalId: string }>
    writeTerminal(params: { terminalId: string; data: string }): Promise<{ success: boolean }>
    killTerminal(params: { terminalId: string }): Promise<{ success: boolean }>
    killAll(): Promise<void>
}
```

基于 VSCode 的 `vscode.Terminal` API，终端创建后自动显示。监听 `onDidCloseTerminal` 清理记录。

### 3.3 PreloadScriptInjector

```typescript
class PreloadScriptInjector {
    inject(projectPath: string, preloadScriptContent: string): Promise<void>
    remove(projectPath: string): Promise<void>
}
```

**注入流程**：
1. 确保 `public/` 目录存在
2. 将 `onlook-preload-script.js` 复制到 `public/`
3. 查找 `layout.tsx`/`_app.tsx`（支持 App Router 和 Pages Router）
4. 检查是否已注入（`/* onlook-preload-script-injected */` 标记）
5. 如需注入：添加 `import Script from 'next/script'`，在 `<body>` 后插入 `<Script>` 标签

### 3.4 状态栏指示器

扩展激活后显示状态栏：
- 运行中：`$(radio-tower) Onlook :9527`
- 未运行：`$(circle-slash) Onlook`
- 点击显示详细状态

配置变更（端口/白名单）时提示重新加载窗口。

---

## 四、Web 端 LocalProvider 详情

### 4.1 连接管理

```
WebSocket 生命周期：
CONNECTING → sendRequest(HANDSHAKE) → CONNECTED
    ↓ onclose                    ↓ sendRequest(任意方法)
RECONNECTING → connect() ──────→ CONNECTED
    ↓ 指数退避（1s, 2s, 4s, ...30s）
```

- **握手**：建立 WS 连接后立即发送 `connect.handshake` 请求（含 token 和 projectPath）
- **自动重连**：连接断开后指数退避重连（最大 30 秒间隔）
- **请求超时**：30 秒无响应自动 reject

### 4.2 请求-响应模式

```typescript
// Web 端发送
sendRequest('file.read', { path: '/src/app/page.tsx' })
  → { id: 'msg_1234_abc', type: 'request', method: 'file.read', params: {...} }

// 扩展端响应
  ← { id: 'msg_1234_abc', type: 'response', method: 'file.read', result: { content: '...' } }
```

每个请求有唯一 ID，pendingRequests Map 跟踪等待中的请求。

### 4.3 事件推送

```
扩展端推送 → Web 端处理：
file.changed  → 触发 fileChangeCallbacks → CodeProviderSync 更新
file.created  → 同上
file.deleted  → 同上
devServer.status → 日志记录
terminal.output → terminalOutputCallbacks
```

### 4.4 子类实现

| 类 | 职责 | WebSocket 方法 |
|-----|------|--------------|
| `LocalFileWatcher` | 文件监听 | `file.watch.start` / `file.watch.stop` |
| `LocalTerminal` | 终端管理 | `terminal.create` / `terminal.write` / `terminal.kill` |
| `LocalTask` | Dev Server 任务 | `devServer.start` / `devServer.stop` / `devServer.restart` |
| `LocalBackgroundCommand` | 后台命令 | `terminal.create` / `terminal.write` / `terminal.kill` |

---

## 五、Web 端集成流程

### 入口 2/3 的 URL 参数

VSCode 扩展通过 `ide-launcher.ts` 构建 URL：

```
http://localhost:3000/?localAgent=9527&token=xxx&workspacePath=/path/to/project&ide=vscode
```

### SessionManager 处理流程

```
1. SandboxManager.initLocal() 被调用
2. session.start() → startLocal()
3. getLocalAgentParamsFromUrl() 从 URL 读取 localAgent/token/workspacePath
4. createCodeProviderClient(CodeProvider.Local, { local: { wsUrl, token, projectPath } })
5. LocalProvider.initialize() → connect() → WebSocket 连接 + 握手
6. provider 设置完成 → MobX reaction 触发
7. initializeSyncEngine(provider) → CodeProviderSync 启动 → 文件同步
8. gitManager.init() → Git 初始化
```

---

## 六、协议对齐表

| Web 端 LocalProvider 方法 | WebSocket 方法名 | 扩展端处理器 |
|--------------------------|-----------------|-------------|
| `writeFile` | `file.write` | `FileOpsManager.writeFile` |
| `readFile` | `file.read` | `FileOpsManager.readFile` |
| `deleteFiles` | `file.delete` | `FileOpsManager.deleteFile` |
| `listFiles` | `file.list` | `FileOpsManager.listFiles` |
| `renameFile` | `file.rename` | `FileOpsManager.renameFile` |
| `statFile` | `file.stat` | `FileOpsManager.statFile` |
| `createDirectory` | `file.mkdir` | `FileOpsManager.mkdir` |
| `watchFiles` | `file.watch.start` | `FileWatcherManager.startWatch` |
| `LocalFileWatcher.stop` | `file.watch.stop` | `FileWatcherManager.stopWatch` |
| `createTerminal` | `terminal.create` | `TerminalManager.createTerminal` |
| `LocalTerminal.write` | `terminal.write` | `TerminalManager.writeTerminal` |
| `LocalTerminal.kill` | `terminal.kill` | `TerminalManager.killTerminal` |
| `LocalTask.run` | `devServer.start` | `DevServerManager.startServer` |
| `LocalTask.restart` | `devServer.restart` | `DevServerManager.restartServer` |
| `LocalTask.stop` | `devServer.stop` | `DevServerManager.stopServer` |
| `ping` | `connect.ping` | 直接响应 `{ pong: true }` |
| 握手 | `connect.handshake` | `SecurityManager.validateConnection` |

---

## 七、兼容性影响

### 对现有 Sandbox 模式的影响

| 模块 | 影响 | 说明 |
|------|------|------|
| CodeProviderSync | 无影响 | LocalProvider 实现相同的 Provider 接口 |
| GitManager | 无影响 | 本地环境 gitStatus 返回空数组 |
| PreloadScript 注入 | 扩展端处理 | Web 端的 `ensurePreloadScriptExists` 也兼容 |
| Frame URL | 已在 Phase 0 处理 | 无 sandboxUrl 时默认 localhost:3000 |
| 下载文件 | 兼容 | 本地环境直接返回文件路径 |

### 数据库

无需新增迁移，Phase 0 的 `environment`/`localPath`/`devServerPort` 字段已就绪。

---

## 八、已知限制与后续工作

| 限制 | 说明 | 计划 |
|------|------|------|
| 终端输出推送 | VSCode Terminal API 不支持直接读取输出 | 需使用 PTY 或 shell 集成 |
| Git 操作 | LocalProvider 的 gitStatus 返回空 | 可在扩展端添加 git 操作方法 |
| 多客户端 | 文件监听和终端输出未按客户端隔离 | 需要按 projectId 分发事件 |
| copyFiles | 扩展端无 file.copy 方法，通过 read+write 模拟 | 可在扩展端添加原生 copy |
