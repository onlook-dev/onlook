# Phase 1 修改文档：VSCode 扩展核心

> 完成日期：2026-04-15

## 一、修改概览

Phase 1 实现了 VSCode/Cursor 扩展的核心功能：WebSocket 服务器、通信协议、文件操作代理、文件监听、URI Handler。

---

## 二、新增文件清单

### 扩展脚手架

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/package.json` | 扩展清单，定义命令、配置、URI Handler |
| `apps/vscode-extension/tsconfig.json` | TypeScript 配置 |
| `apps/vscode-extension/src/extension.ts` | 扩展入口，注册命令和 URI Handler |

### 通信协议

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/src/server/protocol.ts` | WebSocket 消息格式、方法常量、事件常量、工具函数 |
| `apps/vscode-extension/src/server/security.ts` | Token 验证、域名白名单 |

### WebSocket 服务器

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/src/server/agent-server.ts` | WebSocket 服务器核心，连接管理、消息分发、事件广播 |

### 文件操作

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/src/files/file-ops.ts` | 文件 read/write/delete/list/rename/stat/mkdir 代理 |
| `apps/vscode-extension/src/files/file-watcher.ts` | chokidar 文件监听，推送变更事件 |

### 项目管理

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/src/project/project-manager.ts` | 项目创建（npx create-next-app）、Git 克隆 |

### IDE 集成

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/src/browser/ide-launcher.ts` | 在 IDE 中打开文件/文件夹，在浏览器中打开 Onlook |

---

## 三、核心模块说明

### 3.1 通信协议 (protocol.ts)

**消息格式：**
```typescript
interface AgentMessage {
    id: string;              // 请求-响应关联 ID
    type: 'request' | 'response' | 'event';
    method: string;          // 方法名
    params?: unknown;        // 请求参数
    result?: unknown;        // 响应结果
    error?: { code: number; message: string };
}
```

**请求方法（21个）：**
- 连接：`connect.handshake`, `connect.ping`
- 文件：`file.read/write/delete/list/rename/stat/mkdir`
- 监听：`file.watch.start/stop`
- 终端：`terminal.create/write/kill`
- Dev Server：`devServer.start/stop/restart`
- 项目：`project.create/createFromGit`
- IDE：`ide.openFile/openFolder`

**推送事件（6个）：**
- `file.changed/created/deleted`
- `devServer.status`
- `terminal.output`
- `connect.ready`

### 3.2 安全机制 (security.ts)

**Token 流程：**
1. Web 生成 token → 通过 URI 传给扩展
2. 扩展注册 token 到 pending 列表（5分钟有效期）
3. WebSocket 连接时携带 token → 扩展验证
4. 验证通过后 token 移入 verified 列表

**域名白名单：**
- 默认：`['localhost', '127.0.0.1', '*.onlook.com']`
- 支持通配符（`*.onlook.com` 匹配 `sub.onlook.com` 和 `onlook.com`）
- 用户可在 VSCode 设置中自定义

### 3.3 Agent 服务器 (agent-server.ts)

**启动流程：**
1. 创建 HTTP 服务器（提供 `/health` 端点）
2. 创建 WebSocket 服务器
3. 监听连接，等待握手
4. 握手成功后分发消息到对应处理器

**端口管理：**
- 默认 9527，可在设置中配置
- 端口冲突时自动尝试 port+1

**消息分发：**
- 文件操作 → `FileOpsManager`
- 文件监听 → `FileWatcherManager`
- 项目创建 → `ProjectManager`
- IDE 操作 → `IdeLauncher`

### 3.4 URI Handler

**支持两种 URI scheme：**
- `vscode://onlook.<action>?params`
- `cursor://onlook.<action>?params`

**支持的操作：**
- `connect`：注册 token，等待 Web 客户端连接
- `createProject`：创建本地项目

### 3.5 IDE 集成 (ide-launcher.ts)

**三种打开模式：**
1. VSCode → 外部浏览器（`vscode.env.openExternal`）
2. Cursor → 内置浏览器（`simpleBrowser.api.open`）
3. Cursor 内置浏览器失败 → 降级为外部浏览器

---

## 四、VSCode 扩展命令

| 命令 | 说明 |
|------|------|
| `onlook.createProject` | 弹出输入框创建本地项目 |
| `onlook.openProject` | 在浏览器中打开当前项目的 Onlook |
| `onlook.openInBrowser` | 在浏览器中打开 Onlook |
| `onlook.showStatus` | 显示 WebSocket 服务器状态 |

---

## 五、VSCode 配置项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `onlook.agentPort` | number | 9527 | WebSocket 服务器端口 |
| `onlook.allowedOrigins` | string[] | `['localhost', '127.0.0.1', '*.onlook.com']` | 域名白名单 |

---

## 六、待后续 Phase 完成的功能

| 功能 | 状态 | 对应 Phase |
|------|------|------------|
| Dev Server 启动/停止/重启 | 未实现 | Phase 2 |
| 终端创建/写入/终止 | 未实现 | Phase 2 |
| Preload script 注入 | 未实现 | Phase 2 |
| LocalProvider WebSocket 客户端 | 未实现 | Phase 3 |
| Web UI 环境选择界面 | 未实现 | Phase 4 |
