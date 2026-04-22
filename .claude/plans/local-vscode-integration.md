# Onlook 本地 VSCode/Cursor 集成方案

> 最后更新：2026-04-20
> 状态：实施中（Phase 0-5 已完成）

---

## 一、背景与目标

### 现状

Onlook 当前仅支持 CodeSandbox 远程沙箱运行项目，存在以下限制：
- 网络依赖：需访问 CodeSandbox 服务，国内网络不稳定
- 成本：Sandbox 按使用量计费
- 延迟：远程文件操作和热更新有网络延迟

### 目标

集成本地 VSCode/Cursor，让用户可以在本地开发环境中使用 Onlook，Sandbox 作为备选。

### 入口定义（2026-04-20 更新）

| 入口 | IDE | 触发方式 | 浏览器 |
|------|-----|---------|--------|
| 入口 1 | VSCode / Cursor | Web 端选"本地 VSCode"→ URI 打开 IDE | IDE 内置浏览器（降级链） |
| 入口 2（合并） | VSCode / Cursor | IDE 中 `onlook.openProject` 命令 | IDE 内置浏览器（降级链） |

**降级链**：Integrated Browser（VSCode 1.109+）→ Simple Browser iframe → 外部浏览器

**用户配置**：`onlook.useIntegratedBrowser`（默认 `true`），可选择外部浏览器

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────┐
│              Onlook Web (IDE 内置浏览器 / 外部浏览器)        │
│                                                       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Canvas   │  │ EditorEngine │  │     Chat       │  │
│  │ (iframe) │  │              │  │                │  │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘  │
│       │               │                   │           │
│       │    ┌──────────┴───────────────────┘           │
│       │    │  LocalProvider (WebSocket Client)        │
│       │    │  实现 Provider 接口，通过 WebSocket 转发  │
│       │    └──────────┬──────────────────────────────┘
└───────┼───────────────┼───────────────────────────────┘
        │               │
  localhost:PORT    ws://localhost:9527
  (dev preview)    (文件操作、终端、事件)
        │               │
┌───────┼───────────────┼───────────────────────────────┐
│       │   VSCode / Cursor Extension                    │
│       │                                                │
│  ┌────┴─────┐  ┌─────┴────────────┐  ┌────────────┐  │
│  │ Dev      │  │  WebSocket       │  │  File      │  │
│  │ Server   │  │  Server          │  │  Watcher   │  │
│  │ Manager  │  │  (port 9527)     │  │  (chokidar)│  │
│  └──────────┘  └──────────────────┘  └────────────┘  │
│                                                       │
│  ┌────────────┐  ┌────────────────┐  ┌────────────┐  │
│  │ Template   │  │  URI Handler   │  │  Port      │  │
│  │ Manager   │  │  (vscode:// /   │  │  Manager   │  │
│  │            │  │   cursor://)   │  │            │  │
│  └────────────┘  └────────────────┘  └────────────┘  │
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │  本地文件系统 /path/to/project/                │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

---

## 三、数据流

### 文件编辑流程（Web → 本地）

```
用户在 Onlook Web 编辑代码
  ↓
CodeFileSystem.writeFile() (JSX 处理、OID 注入、格式化)
  ↓
CodeProviderSync 检测本地内存变更
  ↓
LocalProvider.writeFile() (WebSocket 消息)
  ↓
VSCode 扩展接收 → 写入本地磁盘
  ↓
本地 dev server (next dev) 检测文件变更 → 热更新
  ↓
Canvas iframe (localhost:PORT) 刷新
  ↓
Preload Script 检测 DOM 变化 → Penpal 通知 parent
  ↓
EditorEngine 更新图层树
```

### 文件编辑流程（VSCode → Web）

```
用户在 VSCode 编辑文件 → 保存
  ↓
扩展 FileWatcher (chokidar) 检测变更
  ↓
WebSocket 推送 file.changed 事件给 Web
  ↓
LocalProvider 接收 → 更新 CodeFileSystem 缓存
  ↓
dev server 热更新 → Canvas iframe 刷新
  ↓
Penpal → EditorEngine 更新
```

### 项目创建流程

```
Web 端：用户选"本地 VSCode" → 点击创建
  ↓
Web 生成 token，调用 api.project.create(environment='local_vscode')
  ↓
数据库创建项目记录（sandboxId=null, localPath=null, environment='local_vscode'）
  ↓
Web 打开 URI: vscode://onlook.createProject?token=xxx&projectId=xxx&onlookUrl=http://172.16.85.110:9000
  ↓
VSCode/Cursor 打开，扩展处理 URI：
  ├─ npx create-next-app@latest /path/to/project
  ├─ 启动 dev server (自动分配端口)
  ├─ 注入 preload script 到 root layout
  ├─ 更新数据库：localPath=/path/to/project, devServerPort=3001
  └─ WebSocket 服务器就绪，通知 Web
  ↓
Web 收到就绪通知 → 刷新 Canvas iframe 加载 localhost:3001
```

---

## 四、核心模块设计

### 4.1 VSCode / Cursor 扩展

#### 包结构

```
apps/vscode-extension/
├── src/
│   ├── extension.ts            # 扩展入口，注册命令/URI Handler
│   ├── server/
│   │   ├── agent-server.ts     # Agent 服务器主类
│   │   ├── websocket-server.ts # WebSocket 服务器
│   │   ├── protocol.ts         # 通信协议定义
│   │   └── security.ts         # Token 验证 + 域名白名单
│   ├── project/
│   │   ├── project-manager.ts  # 项目创建/管理
│   │   ├── terminal-manager.ts # 终端管理
│   │   ├── preload-inject.ts   # Preload script 注入
│   │   └── dev-server.ts       # Dev Server 生命周期管理
│   ├── files/
│   │   ├── file-ops.ts         # 文件读写操作
│   │   ├── file-watcher.ts     # 文件变更监听 (chokidar)
│   ├── browser/
│   │   ├── ide-launcher.ts     # IDE 启动器（降级链：Integrated → Simple → External）
│   │   └── browser-detector.ts # 浏览器能力检测模块
│   └── uri-handler.ts          # URI 处理 (vscode:// / cursor://)
├── package.json                # 扩展清单 (contributes commands, uriHandler, configuration)
└── tsconfig.json
```

#### package.json 关键配置

```json
{
  "name": "onlook-local",
  "displayName": "Onlook",
  "activationEvents": [
    "onUri:onlook.onlook-local",
    "onCommand:onlook.createProject",
    "onCommand:onlook.openProject"
  ],
  "contributes": {
    "commands": [
      { "command": "onlook.createProject", "title": "Onlook: Create Local Project" },
      { "command": "onlook.openProject", "title": "Onlook: Open in IDE Browser" },
      { "command": "onlook.showStatus", "title": "Onlook: Show Connection Status" }
    ],
    "configuration": {
      "title": "Onlook",
      "properties": {
        "onlook.agentPort": {
          "type": "number",
          "default": 9527,
          "description": "WebSocket 服务器端口"
        },
        "onlook.allowedOrigins": {
          "type": "array",
          "default": ["localhost", "127.0.0.1", "*.onlook.com"],
          "description": "允许的 Web 来源域名白名单"
        },
        "onlook.webUrl": {
          "type": "string",
          "default": "http://localhost:3000",
          "description": "Onlook Web URL"
        },
        "onlook.useIntegratedBrowser": {
          "type": "boolean",
          "default": true,
          "description": "优先在 IDE 内置浏览器中打开 Onlook。关闭则使用外部浏览器。"
        },
        "onlook.defaultDevCommand": {
          "type": "string",
          "default": "npm run dev",
          "description": "默认开发命令"
        },
        "onlook.defaultPort": {
          "type": "number",
          "default": 3001,
          "description": "默认开发服务器端口"
        }
      }
    }
  }
}
```

#### 内置浏览器降级链（入口 2 合并后）

```typescript
// browser/browser-detector.ts — 检测 IDE 浏览器能力
export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
  const commands = await vscode.commands.getCommands(true);
  return {
    hasIntegratedBrowser: commands.includes('workbench.action.browser.open'),  // VSCode 1.109+
    hasSimpleBrowser: commands.includes('simpleBrowser.api.open'),              // Simple Browser iframe
    detectedAt: Date.now(),
  };
}

// browser/ide-launcher.ts — 降级链逻辑
async openOnlook(port: number, security: SecurityManager): Promise<void> {
  const useIntegrated = vscode.workspace
    .getConfiguration('onlook')
    .get<boolean>('useIntegratedBrowser', true);

  if (!useIntegrated) {
    // 用户选择外部浏览器
    await vscode.env.openExternal(vscode.Uri.parse(onlookUrl));
    return;
  }

  const capabilities = await detectBrowserCapabilities();
  await this.tryOpenInOrder(onlookUrl, capabilities);
  // Integrated → Simple → External 降级
}
```

> **注意：** VSCode 1.109+ 的 Integrated Browser 是完整 Chromium 实例（非 iframe），
> 支持 DevTools、认证登录、数据持久化，不存在 iframe 嵌套 Penpal 通信问题。
> 旧版 IDE 降级到 Simple Browser iframe，如遇嵌套问题会自动降级到外部浏览器。

### 4.2 通信协议

#### WebSocket 消息格式

```typescript
interface AgentMessage {
  id: string;                          // 消息唯一 ID（请求-响应关联）
  type: 'request' | 'response' | 'event';
  method: string;                       // 方法名
  params?: unknown;                     // 请求参数
  result?: unknown;                     // 响应结果
  error?: { code: number; message: string };
}
```

#### 方法列表（对齐 Provider 接口）

| 分类 | 方法 | 说明 |
|------|------|------|
| 文件 | `file.read` | 读取文件内容 |
| 文件 | `file.write` | 写入文件 |
| 文件 | `file.delete` | 删除文件 |
| 文件 | `file.list` | 列出目录文件 |
| 文件 | `file.rename` | 重命名文件 |
| 文件 | `file.stat` | 获取文件信息 |
| 文件 | `file.mkdir` | 创建目录 |
| 监听 | `file.watch.start` | 开始监听文件变更 |
| 监听 | `file.watch.stop` | 停止监听 |
| 终端 | `terminal.create` | 创建终端 |
| 终端 | `terminal.write` | 向终端写入 |
| 终端 | `terminal.kill` | 终止终端 |
| Dev Server | `devServer.start` | 启动开发服务器 |
| Dev Server | `devServer.stop` | 停止开发服务器 |
| Dev Server | `devServer.restart` | 重启开发服务器 |
| 项目 | `project.create` | 创建项目 |
| 项目 | `project.createFromGit` | 从 Git 仓库创建 |
| IDE | `ide.openFile` | 在 IDE 中打开文件 |
| 连接 | `connect.handshake` | Token 握手验证 |
| 连接 | `connect.ping` | 心跳 |

#### 事件列表（服务器推送）

| 事件 | 说明 |
|------|------|
| `file.changed` | 文件内容变更 |
| `file.created` | 新文件创建 |
| `file.deleted` | 文件删除 |
| `devServer.status` | Dev server 状态变更 (starting/running/stopped/error) |
| `terminal.output` | 终端输出 |
| `connect.ready` | 扩展就绪通知 |

### 4.3 安全机制

#### 连接握手

```typescript
// 1. Web 端生成一次性 token
const token = crypto.randomUUID();

// 2. Token 通过 URI 传递给扩展
// vscode://onlook.connect?token=xxx&onlookUrl=http://172.16.85.110:9000
// 扩展存储 token，等待 WebSocket 连接

// 3. Web 端连接 WebSocket 时携带 token
ws.connect('ws://localhost:9527', { headers: { 'x-onlook-token': token } });

// 4. 扩展验证 token 匹配后允许连接
```

#### 域名白名单

```typescript
// 扩展设置项
interface ExtensionSettings {
  'onlook.allowedOrigins': string[];  // 允许的 Web 来源域名
  // 默认值: ['localhost', '127.0.0.1', '*.onlook.com']
  // 用户可自定义添加内网 IP
}

// WebSocket 升级时检查 Origin
function validateConnection(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;

  // Token 验证（必需）
  const token = req.headers['x-onlook-token'];
  if (!validateToken(token)) return false;

  // 域名白名单验证（可选，为未来固定域名部署准备）
  const allowed = vscode.workspace.getConfiguration('onlook')
    .get<string[]>('allowedOrigins', []);
  if (allowed.length > 0 && !matchOrigin(origin, allowed)) {
    return false;
  }

  return true;
}
```

### 4.4 LocalProvider 实现

#### 包结构

```
packages/code-provider/src/providers/local/
├── index.ts              # LocalProvider 主类
├── websocket-client.ts   # WebSocket 客户端
└── types.ts              # 类型定义
```

#### 核心实现

```typescript
export interface LocalProviderOptions {
  wsUrl: string;          // WebSocket 地址，如 ws://localhost:9527
  token: string;          // 连接 token
  projectPath: string;    // 项目本地路径
}

export class LocalProvider extends Provider {
  private client: LocalWebSocketClient;

  constructor(options: LocalProviderOptions) {
    super();
    this.client = new LocalWebSocketClient(options);
  }

  async initialize(input: InitializeInput): Promise<InitializeOutput> {
    await this.client.connect();
    return {};
  }

  async readFile(input: ReadFileInput): Promise<ReadFileOutput> {
    const result = await this.client.request('file.read', {
      path: input.args.path,
    });
    return { file: result.file };
  }

  async writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
    await this.client.request('file.write', {
      path: input.args.path,
      content: input.args.content,
    });
    return { success: true };
  }

  async watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput> {
    await this.client.request('file.watch.start', {
      path: input.args.path,
    });
    // 监听 file.changed 事件
    return {
      watcher: new LocalFileWatcher(this.client),
    };
  }

  async createTerminal(input: CreateTerminalInput): Promise<CreateTerminalOutput> {
    const result = await this.client.request('terminal.create', {
      cwd: input.args?.cwd,
    });
    return { terminal: new LocalTerminal(this.client, result.id) };
  }

  // ... 其他 Provider 方法
}
```

### 4.5 数据模型变更

#### 新增枚举

```typescript
// packages/models/src/project/environment.ts
enum ProjectEnvironment {
  SANDBOX = 'sandbox',
  LOCAL_VSCODE = 'local_vscode',
}
```

#### Branch 表变更

```sql
-- sandboxId 改为可选
ALTER TABLE branches ALTER COLUMN "sandboxId" DROP NOT NULL;

-- 新增字段
ALTER TABLE branches ADD COLUMN environment TEXT NOT NULL DEFAULT 'sandbox';
ALTER TABLE branches ADD COLUMN "localPath" TEXT;
ALTER TABLE branches ADD COLUMN "devServerPort" INTEGER;
```

```typescript
// packages/models/src/project/branch.ts
interface Branch {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sandbox: { id: string } | null;           // sandbox 环境有值
  environment: ProjectEnvironment;           // 新增
  localPath: string | null;                 // 本地环境有值
  devServerPort: number | null;             // 本地环境有值
  git: { branch: string; commitSha: string; repoUrl: string } | null;
}
```

#### Frame URL 适配

```typescript
// Canvas iframe URL 生成逻辑
function getFrameUrl(branch: Branch): string {
  if (branch.environment === ProjectEnvironment.LOCAL_VSCODE) {
    return `http://localhost:${branch.devServerPort || 3000}`;
  }
  return `https://${branch.sandbox!.id}-3000.csb.app`;
}
```

### 4.6 EditorEngine 适配

```typescript
// apps/web/client/src/components/store/editor/sandbox/index.ts
class SandboxManager {
  async init(branch: Branch) {
    if (branch.environment === ProjectEnvironment.LOCAL_VSCODE) {
      // 本地模式：使用 LocalProvider
      this.provider = new LocalProvider({
        wsUrl: `ws://localhost:${this.agentPort}`,
        token: this.connectionToken,
        projectPath: branch.localPath!,
      });
      await this.provider.initialize({});
    } else {
      // Sandbox 模式：现有逻辑不变
      this.provider = await this.session.start(branch.sandbox!.id);
    }

    // 后续流程复用：CodeProviderSync、Preload Script 注入
    await this.syncEngine.init(this.provider);
    await this.injectPreloadScript();
  }
}
```

---

## 五、两个入口详细流程

### 入口 1：Web → VSCode / Cursor → IDE 内置浏览器

```
1. 用户在 Onlook Web 创建/打开项目
2. 选择"本地 VSCode"环境
3. Web 调用 api.project.create(environment='local_vscode')
4. Web 生成 token，弹出提示："正在打开 VSCode..."
5. Web 打开 URI:
   vscode://onlook.onlook-local?action=createProject&token=xxx&projectId=xxx&onlookUrl=http://172.16.85.110:9000
   或 cursor://onlook.onlook-local?action=createProject&token=xxx&projectId=xxx&onlookUrl=http://172.16.85.110:9000
6. VSCode/Cursor 打开，扩展处理 URI：
   a. 创建项目文件 (npx create-next-app)
   b. 注入 preload script
   c. 启动 dev server（自动分配端口）
   d. 启动 WebSocket 服务器
   e. 更新数据库 localPath + devServerPort
   f. 打开浏览器（使用降级链）：
      ├─ VSCode 1.109+: workbench.action.browser.open(onlookUrl)
      ├─ 旧版: simpleBrowser.api.open(onlookUrl)
      └─ 无内置浏览器: vscode.env.openExternal(onlookUrl)
7. 浏览器加载 Onlook Web，检测 URL 参数
8. Web 自动连接 WebSocket，使用 LocalProvider
9. Canvas iframe 加载 localhost:PORT
```

### 入口 2（合并）：VSCode / Cursor → IDE 内置浏览器

```
1. 用户在 VSCode/Cursor 中打开项目文件夹
2. 通过命令面板运行 "Onlook: Open in IDE Browser"
3. 扩展：
   a. 检查是否为 Onlook 项目（有 .onlook 配置文件或数据库记录）
   b. 启动 dev server
   c. 启动 WebSocket 服务器
   d. 生成连接 token
   e. 根据 onlook.useIntegratedBrowser 配置和 IDE 能力，使用降级链打开浏览器：
      ├─ useIntegrated=true + hasIntegratedBrowser → workbench.action.browser.open
      ├─ useIntegrated=true + hasSimpleBrowser → simpleBrowser.api.open
      ├─ useIntegrated=true + 都没有 → vscode.env.openExternal
      └─ useIntegrated=false → vscode.env.openExternal
4. 浏览器加载 Onlook Web，检测 URL 参数
5. Web 自动连接 WebSocket，使用 LocalProvider
6. Canvas iframe 加载 localhost:PORT
```

---

## 六、关键技术决策

### 6.1 CodeProviderSync 复用

**决策：复用 CodeProviderSync，插入 LocalProvider**

当前架构 `CodeFileSystem → CodeProviderSync → CodesandboxProvider` 已抽象好，
本地模式只需替换为 `CodeFileSystem → CodeProviderSync → LocalProvider(WebSocket)`。
LocalProvider 实现相同 Provider 接口，CodeProviderSync 无需修改。

### 6.2 端口管理

**决策：自动分配 + 持久记录**

```typescript
class PortManager {
  private usedPorts = new Set<number>();

  async allocatePort(preferred: number = 3000): Promise<number> {
    for (let port = preferred; port < preferred + 100; port++) {
      if (!this.isPortInUse(port) && !this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available port');
  }

  releasePort(port: number) {
    this.usedPorts.delete(port);
  }
}
```

端口信息持久化到数据库 `Branch.devServerPort`，项目重新打开时复用。

### 6.3 扩展生命周期

**决策：VSCode 关闭时 kill dev server**

- 扩展 `deactivate()` 时终止所有 dev server 子进程
- 用户下次打开项目时重新启动
- WebSocket 服务器随扩展生命周期

### 6.4 项目模板

**决策：使用 `npx create-next-app`**

- 与 Next.js 生态一致，用户可自定义模板参数
- 扩展也可支持从 Git 仓库创建（复用 `createProjectFromGit`）
- 未来可扩展为扩展内置模板

### 6.5 远程访问（后续迭代）

当前版本扩展 WebSocket 仅监听 `localhost`。
后续如需支持跨机器访问（Web 和 VSCode 不在同一机器），
扩展可增加 `onlook.listenAddress` 配置项，支持 `0.0.0.0`。

---

## 七、Web UI 改造

### 7.1 环境选择 UI

项目创建页面新增环境选择：

```
┌─────────────────────────────────┐
│  创建新项目                      │
│                                 │
│  项目名称: [my-app            ] │
│                                 │
│  运行环境:                      │
│  ┌──────────┐ ┌──────────────┐ │
│  │ Sandbox  │ │ 本地 VSCode  │ │
│  │ (云端)   │ │ (本地开发)   │ │
│  └──────────┘ └──────────────┘ │
│                                 │
│  [创建项目]                     │
└─────────────────────────────────┘
```

### 7.2 本地环境检测

```typescript
// 检测本地扩展是否在线
async function detectLocalAgent(): Promise<{
  available: boolean;
  port?: number;
}> {
  try {
    const res = await fetch('http://localhost:9527/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return { available: true, port: data.port };
    }
  } catch {}
  return { available: false };
}
```

### 7.3 URL 参数注入

```typescript
// Web 端检测 URL 参数，自动切换为本地模式
const urlParams = new URLSearchParams(window.location.search);
const localAgentPort = urlParams.get('localAgent');
const connectionToken = urlParams.get('token');

if (localAgentPort && connectionToken) {
  // 使用 LocalProvider 连接本地扩展
  editorEngine.sandbox.useLocalProvider({
    wsUrl: `ws://localhost:${localAgentPort}`,
    token: connectionToken,
  });
}
```

---

## 八、CodeProvider 枚举扩展

```typescript
// packages/code-provider/src/providers.ts
export enum CodeProvider {
  CodeSandbox = 'code_sandbox',
  E2B = 'e2b',
  Daytona = 'daytona',
  VercelSandbox = 'vercel_sandbox',
  Modal = 'modal',
  NodeFs = 'node_fs',
  Local = 'local',           // 新增：本地 VSCode/Cursor 扩展
}
```

```typescript
// packages/code-provider/src/index.ts
function newProviderInstance(codeProvider: CodeProvider, providerOptions: ProviderInstanceOptions) {
  // ... 现有分支 ...

  if (codeProvider === CodeProvider.Local) {
    if (!providerOptions.local) {
      throw new Error('Local provider options are required.');
    }
    return new LocalProvider(providerOptions.local);
  }
}
```

---

## 九、风险评估与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Simple Browser iframe 嵌套导致 Penpal 通信失败 | 入口 2 Simple Browser 模式不可用 | 中 | 自动降级到外部浏览器，提示用户升级 VSCode |
| Integrated Browser 降级链中断 | 所有内置浏览器不可用 | 低 | 最终降级到外部浏览器 |
| WebSocket 安全风险 | 本地文件泄露 | 低 | Token 握手 + 域名白名单 + localhost 绑定 |
| 端口冲突 | Dev server 启动失败 | 中 | 自动分配端口，重试逻辑 |
| VSCode 扩展 API 变更 | 兼容性问题 | 低 | 指定最低 VSCode 版本，API 兼容性检查 |
| dev server 僵尸进程 | 端口占用 | 中 | deactivate 时强制 kill，启动前检测清理 |
| create-next-app 网络依赖 | 模板创建失败 | 中 | 内置基础模板作为 fallback |
| CORS 阻止 WebSocket | 连接失败 | 低 | WebSocket 不受 CORS 限制；HTTP health check 需配置 |

---

## 十、实施计划

### Phase 0：数据模型改造（3-5 天）

- [ ] 新增 `ProjectEnvironment` 枚举
- [ ] Branch 表 `sandboxId` 改为可选
- [ ] 新增 `environment`、`localPath`、`devServerPort` 字段
- [ ] 更新 tRPC API：`project.create` 支持 `environment` 参数
- [ ] 更新 Branch Model 类型定义

### Phase 1：VSCode 扩展核心（5-7 天）

- [ ] 扩展脚手架搭建（package.json、extension.ts）
- [ ] WebSocket 服务器实现
- [ ] 通信协议定义与实现
- [ ] Token 握手 + 域名白名单安全机制
- [ ] 文件操作代理（read/write/list/delete/rename）
- [ ] 文件监听（chokidar → WebSocket 推送）
- [ ] URI Handler（vscode:// / cursor://）

### Phase 2：Dev Server 与项目管理（3-5 天）

- [ ] Dev Server 启动/停止/重启管理
- [ ] 端口自动分配
- [ ] 项目模板创建（npx create-next-app）
- [ ] Preload script 注入（通过扩展修改本地文件）
- [ ] 扩展生命周期管理（deactivate 清理）

### Phase 3：LocalProvider 实现（3-5 天）

- [ ] `CodeProvider.Local` 枚举值
- [ ] `LocalProvider` 类（实现 Provider 接口）
- [ ] `LocalWebSocketClient` 通信层
- [ ] `LocalFileWatcher`、`LocalTerminal` 适配
- [ ] EditorEngine/SandboxManager 适配双环境

### Phase 4：Web UI 改造（3-5 天）

- [ ] 环境选择 UI（项目创建页面）
- [ ] 本地扩展在线检测
- [ ] URL 参数解析与自动连接
- [ ] 项目卡片显示环境类型
- [ ] Frame URL 适配（sandbox vs localhost）

### Phase 5：内置浏览器适配（已完成）

- [x] 创建 `browser-detector.ts` 浏览器能力检测模块
- [x] 重构 `ide-launcher.ts` 降级链（Integrated → Simple → External）
- [x] 新增 `onlook.useIntegratedBrowser` 配置项
- [x] 合并入口 2/3，移除 `onlook.openInBrowser` 命令

### Phase 6：测试与优化（5-7 天）

- [ ] 端到端测试（两个入口）
- [ ] 多项目并发测试
- [ ] 端口冲突测试
- [ ] 异常恢复测试（网络断开、扩展崩溃）
- [ ] Windows/macOS/Linux 跨平台测试
- [ ] 性能优化（WebSocket 消息合并、文件监听去重）

---

## 十一、文件影响范围

### 新增文件

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/**` | VSCode/Cursor 扩展（新包） |
| `apps/vscode-extension/src/browser/browser-detector.ts` | 浏览器能力检测模块 |
| `packages/code-provider/src/providers/local/index.ts` | LocalProvider |
| `packages/code-provider/src/providers/local/websocket-client.ts` | WebSocket 客户端 |
| `packages/code-provider/src/providers/local/types.ts` | 类型定义 |
| `packages/models/src/project/environment.ts` | ProjectEnvironment 枚举 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `packages/code-provider/src/providers.ts` | 新增 `CodeProvider.Local` |
| `packages/code-provider/src/index.ts` | 新增 LocalProvider 工厂分支 |
| `packages/db/src/schema/project/branch.ts` | sandboxId 可选 + 新增字段 |
| `packages/models/src/project/branch.ts` | 类型更新 |
| `apps/web/client/src/server/api/routers/project/project.ts` | create 支持 environment |
| `apps/web/client/src/server/api/routers/project/sandbox.ts` | 仅 sandbox 环境调用 |
| `apps/web/client/src/components/store/editor/sandbox/index.ts` | 双环境 Provider 选择 |
| `apps/web/client/src/components/store/create/manager.ts` | 支持本地创建流程 |
| `apps/web/client/src/env.ts` | 可能新增本地代理相关配置 |
| `apps/web/client/src/app/project/[id]/_components/canvas/frame/view.tsx` | Frame URL 适配 |

---

## 十二、依赖关系

```
Phase 0 (数据模型) ──→ Phase 1 (扩展核心) ──→ Phase 3 (LocalProvider)
                        │                          │
                        └──→ Phase 2 (Dev Server)   └──→ Phase 4 (Web UI)
                                                           │
                                                           └──→ Phase 5 (内置浏览器适配 ✅)
                                                                  │
                                                                  └──→ Phase 6 (测试)
```

**建议：** Phase 0-3 为核心路径，完成即可基本可用。Phase 4-6 为体验优化。
