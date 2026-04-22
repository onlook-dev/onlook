# 入口 2 完善实施计划

> 日期：2026-04-16
> 状态：待确认
> 范围：入口 2（IDE 打开浏览器 → 连接 Onlook）的完善

---

## 一、需求重述

完善入口 2 的用户体验，修复 4 个已发现的问题：

1. **端口冲突未正确处理**：若 3001 被占用，Onlook 界面无法预览（Frame 不会更新到新端口）
2. **项目重复创建**：同一项目每次从扩展打开都会创建新的项目记录，不复用已有项目
3. **浏览器关闭后 Dev Server 未停止**：关闭浏览器标签页后，localhost 端口上的 dev server 进程仍在运行
4. **Terminal 未连接本地终端**：Onlook 的 terminal UI 无法与 VSCode 扩展创建的终端通信

### 对入口 1/3 的影响分析

| 修复项 | 对入口 1 的影响 | 对入口 3 的影响 |
|--------|----------------|----------------|
| 端口冲突 | ✅ 共享修复 — 入口1也需要端口分配和Frame更新 | ✅ 共享修复 |
| 项目复用 | ⚠️ 需适配 — 入口1通过 URI 传 projectId，需要先查找再创建 | ✅ 共享修复 |
| Dev Server 清理 | ✅ 共享修复 — 三个入口都需要 | ✅ 共享修复 |
| Terminal 连接 | ✅ 共享修复 — 三个入口使用同一套 LocalTerminal | ✅ 共享修复 |

**结论**：所有修复对入口 1/3 都有正面影响，不会破坏它们的流程。项目复用需要在入口 1 的 URI 中也传入 `workspacePath` 以便查找已有项目。

---

## 二、4 个问题的根因分析

### Bug 1：端口冲突导致无法预览

**根因**：Dev Server 端口分配和 Frame URL 更新之间存在时序问题。

- 扩展端 `DevServerManager.allocatePort()` 正确地分配了端口（3001→3002→...），并通过 `DEV_SERVER_STATUS` 事件推送
- Web 端 `SessionManager.onDevServerStatus` 回调正确更新 `branch.devServerPort` 并写回数据库
- `resolveFrameUrl()` 依赖 `useMemo([..., branchData?.branch.devServerPort])` 计算新 URL
- **但问题是**：`branchData` 来自 `editorEngine.branches.getBranchDataById()`，这个数据是否实时响应 `devServerPort` 的 MobX 更新？

**需要验证**：branch 对象是否通过 `makeAutoObservable` 让 `devServerPort` 变为 observable。如果不是，`useMemo` 不会触发更新。

**修复方案**：
1. 确保 `branch.devServerPort` 变更能触发 `resolveFrameUrl` 重新计算
2. Frame URL 更新后，需要 reload iframe（当前 `src` 变更后浏览器会自动加载，但需要验证 Penpal 连接是否重建）

### Bug 2：项目重复创建

**根因**：每次从扩展打开浏览器，都生成新 token → 触发 `useLocalAgentAutoConnect` → 调用 `createProject`，完全没有去重逻辑。

具体流程：
1. 用户在 VSCode 执行 "Onlook: Open in Browser"
2. 扩展调用 `ideLauncher.openOnlook()` → 生成新 token → 打开浏览器 `http://localhost:3000/?localAgent=9527&token=NEW_TOKEN&workspacePath=/path/to/project`
3. Web 端 `useLocalAgentAutoConnect` 检测到参数 → `createProject()` → 创建新项目
4. 用户关闭浏览器，再次执行命令 → 又一个新 token → 又一个新项目

**修复方案**：
1. `useLocalAgentAutoConnect` 先查询已有项目（按 `localPath` 匹配），找到则复用
2. 在 tRPC router 新增 `findByLocalPath` 查询
3. 复用项目时，直接跳转到项目页面（携带连接参数），不创建新记录

### Bug 3：浏览器关闭后 Dev Server 未停止

**根因**：
- 浏览器关闭 → WebSocket 断开 → 扩展端 `ws.on('close')` 只停止了文件监听
- 没有任何机制在客户端断开时停止 Dev Server
- `SandboxManager.clear()` 只在路由切换时调用，不在页面关闭时调用

**修复方案**：
1. Web 端：添加 `beforeunload` 事件，调用 `provider.stopProject()` 通知扩展停止 Dev Server
2. 扩展端：WebSocket 客户端断开时，如果该客户端关联了 Dev Server，延迟一段时间后停止（避免页面刷新时误停）

### Bug 4：Terminal 未连接本地终端

**根因**：扩展端 `TerminalManager.createTerminal()` 创建了 VSCode Terminal，但**没有捕获输出**。VSCode 提供了 `vscode.window.onDidWriteTerminalData` API 来监听终端输出，但当前代码没有使用。

具体断链：
- 扩展端：创建终端 → 返回 `terminalId` → **没有监听输出**
- LocalProvider：有 `terminalOutputCallbacks` Map → 有 `TERMINAL_OUTPUT` 事件处理 → **但从未收到数据**
- Web UI：xterm → `terminal.onOutput(callback)` → `this.xterm.write(data)` → **但 callback 从未触发**

**修复方案**：
1. 扩展端 `TerminalManager.createTerminal()` 添加 `onDidWriteTerminalData` 监听
2. 将终端输出通过 `eventCallback(AgentEvents.TERMINAL_OUTPUT, ...)` 推送
3. Web 端的 `xterm.onData` → `terminal.write(data)` 路径已实现，只需扩展端发出输出即可打通

---

## 三、实施步骤

### Step 1：Terminal 输出流打通（Bug 4）

**修改文件**：`apps/vscode-extension/src/project/terminal-manager.ts`

```typescript
// createTerminal() 方法中，创建终端后添加输出监听
const dataListener = vscode.window.onDidWriteTerminalData((event) => {
    if (event.terminal === terminal) {
        this.eventCallback(AgentEvents.TERMINAL_OUTPUT, {
            terminalId: terminalId,
            data: event.data,
        });
    }
});

// 存储监听器以便清理
entry.dataListener = dataListener;
```

更新 `TerminalEntry` 接口，添加 `dataListener` 字段。在 `killTerminal()` 和 `killAll()` 中 dispose 监听器。

**复杂度**：Low
**对入口 1/3 的影响**：共享修复，三个入口使用同一套 LocalTerminal

### Step 2：项目复用 — 去重逻辑（Bug 2）

**修改文件**：

1. **`apps/web/client/src/server/api/routers/project/project.ts`**
   - 新增 `findByLocalPath` query：按 `localPath` + `userId` 查找已有项目

2. **`apps/web/client/src/app/projects/page.tsx`**
   - `useLocalAgentAutoConnect` 修改逻辑：
     ```
     if (workspacePath) {
       // 先查询已有项目
       existingProject = await findByLocalPath({ localPath: workspacePath })
       if (existingProject) {
         // 复用：直接跳转到已有项目
         router.replace(projectUrl with existingProject.id)
         return
       }
     }
     // 没有已有项目才创建
     createProject(...)
     ```

3. **`apps/web/client/src/app/projects/_components/top-bar.tsx`**
   - `handleStartLocalProject` 修改：检测扩展状态后，如果有 `workspacePath`，先查找已有项目

**复杂度**：Medium
**对入口 1/3 的影响**：入口 1 的 URI 中也需要包含 `workspacePath` 参数，以便查找已有项目

### Step 3：Frame URL 动态更新验证与修复（Bug 1）

**修改文件**：

1. **`apps/web/client/src/app/project/[id]/_components/canvas/frame/view.tsx`**
   - 验证 `branchData?.branch.devServerPort` 是否通过 MobX 变为 observable
   - 如果不是：改为使用 `editorEngine.branches` 的 observable 数据源
   - 确认 `src={resolvedUrl}` 变更后 iframe 是否自动 reload（React 行为：是）
   - 确认 Penpal 连接是否在 URL 变更后重建（`onLoad={setupPenpalConnection}` 应该会触发）

2. **`packages/models/src/project/branch.ts`**（如果需要）
   - 确认 `devServerPort` 在 MobX observable 中

**复杂度**：Medium（需要验证）
**对入口 1/3 的影响**：共享修复

### Step 4：浏览器关闭时 Dev Server 清理（Bug 3）

**修改文件**：

1. **`apps/web/client/src/components/store/editor/sandbox/index.ts`**
   - 在 `initLocal()` 中注册 `beforeunload` 事件：
     ```typescript
     window.addEventListener('beforeunload', this.handleBeforeUnload);
     ```
   - `handleBeforeUnload` 调用 `this.session.provider?.stopProject()`
   - 在 `clear()` 中移除事件监听

2. **`apps/vscode-extension/src/server/agent-server.ts`**
   - WebSocket 客户端断开时（`ws.on('close')`），延迟停止 Dev Server：
     ```typescript
     ws.on('close', () => {
         const client = this.clients.get(ws);
         if (client?.projectPath) {
             // 延迟 30 秒后停止 dev server（避免页面刷新误停）
             setTimeout(() => {
                 // 检查是否还有其他客户端连接同一项目
                 const hasOtherClients = [...this.clients.values()]
                     .some(c => c.projectPath === client.projectPath);
                 if (!hasOtherClients) {
                     this.devServerManager.stopServer({ projectPath: client.projectPath });
                 }
             }, 30000);
         }
         this.fileWatcherManager?.stopAll();
         this.clients.delete(ws);
     });
     ```

**复杂度**：Medium
**对入口 1/3 的影响**：共享修复，三个入口都需要

### Step 5：端口分配健壮性增强

**修改文件**：`apps/vscode-extension/src/project/dev-server.ts`

当前实现已经能处理端口冲突（`allocatePort` 循环尝试 100 个端口），核心问题在于 Frame URL 不随端口变化而更新（Step 3 修复）。

额外增强：
1. `startServer()` 接收到 `preferredPort` 时，如果该端口被占用，自动尝试下一个可用端口并返回实际端口
2. 返回结果中明确包含 `port` 字段，确保调用方拿到的是实际端口
3. 确保 `DEV_SERVER_STATUS` 事件在 `running` 状态时始终携带正确的 `port`

**复杂度**：Low（当前实现基本正确，主要是 Step 3 的 Frame 更新问题）

---

## 四、依赖关系

```
Step 1 (Terminal) ──── 独立，可先做
Step 2 (项目复用) ──── 独立，可先做
Step 3 (Frame URL) ──── 独立，可先做
Step 4 (Dev Server 清理) ──── 依赖 Step 3（需要确认 Frame 行为）
Step 5 (端口健壮性) ──── 依赖 Step 3（核心问题在 Frame 更新）
```

建议执行顺序：**Step 1 → Step 3 → Step 5 → Step 2 → Step 4**

- Step 1 最简单且效果直观
- Step 3 和 Step 5 关联，先修复 Frame URL 再验证端口
- Step 2 需要后端改动，独立进行
- Step 4 依赖整体流程跑通

---

## 五、风险

| 风险 | 概率 | 缓解 |
|------|------|------|
| `onDidWriteTerminalData` API 仅在 VSCode 1.93+ 可用 | 低 | 检查最低版本要求，添加版本检测 |
| MobX observable 链路断裂，Frame URL 不更新 | 中 | Step 3 需要仔细验证，必要时添加 autorun |
| beforeunload 不可靠（移动端、强制关闭） | 中 | 扩展端延迟 30 秒停止作为兜底 |
| findByLocalPath 查询性能 | 低 | 添加索引，local_path + user_id 组合查询 |
| 多标签页场景：同一项目打开两个浏览器标签 | 中 | 扩展端按 client 追踪，最后一个断开才停止 Dev Server |

---

## 六、验收标准

- [ ] **Terminal**：在 Onlook Web 的 Terminal 面板中能看到 VSCode 终端的输出，并能发送命令
- [ ] **项目复用**：同一项目第二次从扩展打开时，直接打开已有项目，不创建新记录
- [ ] **端口冲突**：3001 被占用时，Dev Server 自动分配 3002，Canvas iframe 正确显示 localhost:3002
- [ ] **Dev Server 清理**：关闭所有浏览器标签后，Dev Server 进程在 30 秒内自动停止
