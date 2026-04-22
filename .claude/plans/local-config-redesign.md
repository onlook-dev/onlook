# 入口 2 完善：localConfig 配置化 + 4 Bug 修复

> 日期：2026-04-16
> 状态：待确认
> 前置文档：`vscode-integration-deep-review.md`、`entry2-completion-plan.md`

---

## 一、核心设计决策

### 决策 1：删除 `devServerPort`，以 `localConfig.port` 为唯一端口来源

**之前**（复杂）：用户配端口 → 扩展自动分配（可能不同）→ 回写 devServerPort → Frame URL 异步更新
**现在**（简单）：用户配端口 → 就是这个端口 → Frame URL 直接读取

| 对比项 | devServerPort（旧） | localConfig.port（新） |
|--------|---------------------|----------------------|
| 来源 | 运行时自动检测 | 用户配置 |
| 时序 | 异步（dev server 启动后才知） | 同步（创建项目时即知） |
| Frame URL | 需等端口回传才能渲染 | 立即可用 |
| 端口冲突 | 自动分配新端口（用户不知） | 报错提示用户修改 |

**理由**：
- 主流框架（Next.js/Vite/CRA/Nuxt）都尊重 `PORT` 环境变量
- 用户了解自己的环境，被占用了改端口比"自动分配到 3004 但界面还显示 3001"好
- Frame URL 不再有时序竞争问题

### 决策 2：端口冲突 → 报错提示 → 用户修改 → 重启

```
dev server 启动失败（端口被占用）
  → DEV_SERVER_STATUS { status: 'error', error: 'Port 3001 is already in use' }
  → Web UI 显示 Toast "端口 3001 被占用，请修改端口后重启"
  → 用户在设置中修改 localConfig.port → 点击重启按钮
  → dev server 在新端口启动
```

### 决策 3：Dev Server 命令用户可配置

```typescript
interface LocalConfig {
  devCommand: string;    // 默认 "npm run dev"
  buildCommand: string;  // 默认 "npm run build"（后续迭代）
  port: number;          // 默认 3001
}
```

配置来源优先级：
1. DB 中已保存的 `localConfig`
2. 扩展 VSCode 设置 `onlook.defaultDevCommand` / `onlook.defaultPort`
3. 从 `package.json` scripts 智能推断
4. 硬编码默认值

---

## 二、数据模型变更

### 删除 `devServerPort`

| 文件 | 改动 |
|------|------|
| `packages/models/src/project/branch.ts` | 删除 `devServerPort`，新增 `localConfig: LocalConfig \| null` |
| `packages/db/src/schema/project/branch.ts` | 删除 `devServerPort` 列，新增 `localConfig` JSONB 列 |
| `packages/db/src/mappers/project/branch.ts` | 删除 devServerPort 映射，新增 localConfig |
| `packages/db/src/defaults/branch.ts` | 删除 devServerPort，新增 localConfig |

### 新增 `LocalConfig` 接口

```typescript
// packages/models/src/project/branch.ts
export interface LocalConfig {
  devCommand: string;
  buildCommand: string;
  port: number;
}

export const DEFAULT_LOCAL_CONFIG: LocalConfig = {
  devCommand: 'npm run dev',
  buildCommand: 'npm run build',
  port: 3001,
};
```

### DB Schema

```sql
-- 删除
ALTER TABLE branches DROP COLUMN dev_server_port;
-- 新增
ALTER TABLE branches ADD COLUMN local_config JSONB;
```

---

## 三、完整修改文件清单

### 数据模型层（5 文件）

| 文件 | 改动 |
|------|------|
| `packages/models/src/project/branch.ts` | 新增 `LocalConfig`、`DEFAULT_LOCAL_CONFIG`；删除 `devServerPort`；新增 `localConfig` |
| `packages/db/src/schema/project/branch.ts` | 删除 `devServerPort` 列；新增 `localConfig` JSONB 列 |
| `packages/db/src/mappers/project/branch.ts` | 适配新字段 |
| `packages/db/src/defaults/branch.ts` | 适配新字段 |
| `packages/db/src/seed/db.ts` | 适配新字段 |

### 扩展端（6 文件）

| 文件 | 改动 |
|------|------|
| `apps/vscode-extension/src/server/protocol.ts` | `DevServerStartParams` 新增 `devCommand`；`DevServerStatusEvent` 删除 `port` |
| `apps/vscode-extension/src/project/dev-server.ts` | 使用用户 `devCommand`；删除 `allocatePort` 自动分配；端口冲突直接报错 |
| `apps/vscode-extension/src/project/terminal-manager.ts` | 添加 `onDidWriteTerminalData` 输出监听 |
| `apps/vscode-extension/src/server/agent-server.ts` | WebSocket 断开延迟停止 Dev Server；`pushStatus` 不再传 port |
| `apps/vscode-extension/src/browser/ide-launcher.ts` | URL 参数新增 `devCommand`/`port` |
| `apps/vscode-extension/package.json` | 新增 `onlook.defaultDevCommand`/`onlook.defaultPort` 配置项；升级 engines 到 ^1.93.0 |

### Provider 层（3 文件）

| 文件 | 改动 |
|------|------|
| `packages/code-provider/src/providers/local/types.ts` | `LocalProviderOptions` 新增 `localConfig`；`DevServerStatusEvent` 删除 `port` |
| `packages/code-provider/src/providers/local/index.ts` | `LocalTask.run()` 传递 `devCommand`+`port`；删除 devServerPort 回写逻辑 |
| `packages/code-provider/src/index.ts` | 工厂方法适配 |

### Web 端 API（3 文件）

| 文件 | 改动 |
|------|------|
| `apps/web/client/src/server/api/routers/project/project.ts` | `create` 用 `localConfig` 替代 `devServerPort`；新增 `findByLocalPath` query |
| `apps/web/client/src/server/api/routers/project/branch.ts` | 删除 devServerPort，适配 localConfig |
| `apps/web/client/src/server/api/routers/project/fork.ts` | 适配 |

### Web 端 UI（6 文件）

| 文件 | 改动 |
|------|------|
| `apps/web/client/src/app/projects/page.tsx` | `useLocalAgentAutoConnect` 先查已有项目再创建 |
| `apps/web/client/src/app/projects/_components/top-bar.tsx` | `handleStartLocalProject` 去重 + 传递 localConfig |
| `apps/web/client/src/app/project/[id]/_components/canvas/frame/view.tsx` | `resolveFrameUrl` 从 `localConfig.port` 读端口 |
| `apps/web/client/src/components/store/editor/sandbox/index.ts` | `beforeunload` 清理；删除 `devServerPort` 相关逻辑 |
| `apps/web/client/src/components/store/editor/sandbox/session.ts` | `startLocal` 传递 localConfig；删除 `onDevServerStatus` 端口回写 |
| `apps/web/client/src/components/store/create/manager.ts` | `startCreateLocal` 传递 localConfig |

---

## 四、实施步骤

### Step 1：数据模型变更

删除 `devServerPort`，新增 `LocalConfig` + `localConfig` JSONB。

**改动文件**：
1. `packages/models/src/project/branch.ts`
2. `packages/db/src/schema/project/branch.ts`
3. `packages/db/src/mappers/project/branch.ts`
4. `packages/db/src/defaults/branch.ts`
5. `packages/db/src/seed/db.ts`

**复杂度**：Low

### Step 2：Terminal 输出流打通

扩展端 `TerminalManager.createTerminal()` 添加 `onDidWriteTerminalData` 监听，通过 `TERMINAL_OUTPUT` 事件推送终端输出。

**改动文件**：
1. `apps/vscode-extension/src/project/terminal-manager.ts`
2. `apps/vscode-extension/package.json`（升级 engines 到 ^1.93.0）

**复杂度**：Low

### Step 3：扩展端 DevServerManager 使用用户配置

1. 删除 `allocatePort()` 自动分配逻辑
2. `startServer()` 使用用户 `devCommand`，设置 `PORT` 环境变量
3. 端口被占用时直接报错（不再自动尝试下一个端口）
4. `pushStatus` 事件不再包含 `port` 字段

**改动文件**：
1. `apps/vscode-extension/src/project/dev-server.ts`
2. `apps/vscode-extension/src/server/protocol.ts`
3. `apps/vscode-extension/package.json`

**复杂度**：Medium

### Step 4：LocalProvider 适配

1. `LocalProviderOptions` 新增 `localConfig`
2. `LocalTask.run()` 传递 `devCommand` + `port`
3. `DevServerStatusEvent` 删除 `port`
4. 删除 `onDevServerStatus` 中的端口回写逻辑

**改动文件**：
1. `packages/code-provider/src/providers/local/types.ts`
2. `packages/code-provider/src/providers/local/index.ts`

**复杂度**：Medium

### Step 5：Web 端 API 适配

1. `project.create` 使用 `localConfig` 替代 `devServerPort`
2. 新增 `findByLocalPath` query（项目去重）
3. Frame 默认 URL 从 `localConfig.port` 生成

**改动文件**：
1. `apps/web/client/src/server/api/routers/project/project.ts`
2. `apps/web/client/src/server/api/routers/project/branch.ts`
3. `apps/web/client/src/server/api/routers/project/fork.ts`

**复杂度**：Medium

### Step 6：Web 端 UI 适配

1. `resolveFrameUrl` 从 `localConfig.port` 读端口
2. `useLocalAgentAutoConnect` 先查已有项目
3. `SessionManager.startLocal` 传递 localConfig，删除端口回写
4. `SandboxManager.initLocal` 注册 `beforeunload` 清理
5. 端口冲突 Toast 提示

**改动文件**：
1. `apps/web/client/src/app/project/[id]/_components/canvas/frame/view.tsx`
2. `apps/web/client/src/app/projects/page.tsx`
3. `apps/web/client/src/app/projects/_components/top-bar.tsx`
4. `apps/web/client/src/components/store/editor/sandbox/index.ts`
5. `apps/web/client/src/components/store/editor/sandbox/session.ts`
6. `apps/web/client/src/components/store/create/manager.ts`

**复杂度**：Medium

### Step 7：扩展端 WebSocket 断开时清理 Dev Server

WebSocket 客户端断开后，延迟 30 秒停止 Dev Server（避免页面刷新误停），如果没有其他客户端连接同一项目。

**改动文件**：
1. `apps/vscode-extension/src/server/agent-server.ts`

**复杂度**：Low

---

## 五、执行顺序

```
Step 1 (数据模型) ──→ Step 4 (LocalProvider) ──→ Step 6 (Web UI)
      ↓                      ↓
Step 3 (DevServer) ──────────┘
      
Step 2 (Terminal) ──── 独立，随时可做
Step 5 (Web API) ──── 依赖 Step 1
Step 7 (WS 清理) ──── 依赖 Step 3
```

建议顺序：**1 → 2 → 3 → 4 → 5 → 6 → 7**

---

## 六、关键代码片段

### DevServerManager.startServer — 使用用户命令

```typescript
async startServer(params: unknown): Promise<{ status: string }> {
    const { projectPath, devCommand, port } = params as DevServerStartParams;
    
    const cmd = devCommand ?? 'npm run dev';
    const targetPort = port ?? 3001;
    
    // 先检查端口是否可用，不可用直接报错
    if (!(await this.isPortAvailable(targetPort))) {
        const error = `Port ${targetPort} is already in use. Please change the port in settings.`;
        this.pushStatus(projectPath, 'error', error);
        throw new Error(error);
    }

    // 解析命令字符串
    const [command, ...args] = parseCommand(cmd);
    
    // 通过 PORT 环境变量 + CLI 参数双重确保端口
    const env = { ...process.env, PORT: String(targetPort) };
    
    const devProcess = spawn(command, args, {
        cwd: projectPath,
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    // ... 就绪检测逻辑不变
}
```

### Frame URL — 同步读取 localConfig.port

```typescript
function resolveFrameUrl(frame: Frame, branchData: ...): string {
    if (environment === ProjectEnvironment.LOCAL_VSCODE) {
        // 直接从配置读取端口，不再等待异步检测
        const port = branchData?.branch.localConfig?.port ?? 3001;
        try {
            const urlObj = new URL(frame.url);
            return `http://localhost:${port}${urlObj.pathname}`;
        } catch {
            return `http://localhost:${port}`;
        }
    }
    return frame.url;
}
```

### 项目去重 — findByLocalPath

```typescript
findByLocalPath: protectedProcedure
    .input(z.object({ localPath: z.string() }))
    .query(async ({ ctx, input }) => {
        const branch = await ctx.db.query.branches.findFirst({
            where: and(
                eq(branches.localPath, input.localPath),
                eq(branches.environment, 'local_vscode'),
            ),
            with: { project: { with: { userProjects: true } } },
        });
        if (!branch) return null;
        const isOwner = branch.project.userProjects.some(
            up => up.userId === ctx.user.id
        );
        if (!isOwner) return null;
        return { projectId: branch.projectId, branchId: branch.id };
    }),
```

---

## 七、风险

| 风险 | 概率 | 缓解 |
|------|------|------|
| JSONB 在 drizzle-orm 中的类型安全 | 中 | 使用 `jsonb()` + Zod schema 验证 |
| `onDidWriteTerminalData` 需要 VSCode 1.93+ | 中 | 升级 engines 到 ^1.93.0 |
| 用户不知道哪个端口空闲 | 低 | 端口冲突时在提示中建议可用端口 |
| 框架不尊重 PORT 环境变量 | 低 | Next.js/Vite/CRA 都支持；不支持的用户需自行在命令中指定 `--port` |
| 删除 devServerPort 影响已有数据 | 低 | 迁移时丢弃即可，该字段之前未被正确使用 |

---

## 八、验收标准

- [ ] **Terminal**：Onlook Web Terminal 面板能看到终端输出并发送命令
- [ ] **项目复用**：同一项目第二次打开时复用已有记录
- [ ] **端口配置**：用户可配置 devCommand 和 port，Frame URL 同步正确
- [ ] **端口冲突**：端口被占用时报错提示，用户修改后重启可正常启动
- [ ] **Dev Server 清理**：关闭所有浏览器标签后 Dev Server 30 秒内自动停止
- [ ] **数据模型**：`devServerPort` 已删除，`localConfig` JSONB 已替代
