# VSCode 插件集成：深度分析报告

> 日期：2026-04-16
> 状态：待确认

---

## 一、项目目标回顾

**核心目标**：集成本地 VSCode/Cursor，让用户在本地开发环境中使用 Onlook，CodeSandbox 作为备选。

**三个入口**：

| 入口 | IDE | 触发方式 | 浏览器 |
|------|-----|---------|--------|
| 入口 1 | VSCode/Cursor | Web 端选"本地 VSCode" → URI 打开 IDE | 外部浏览器 |
| 入口 2 | VSCode/Cursor | IDE 中执行命令 → 打开外部浏览器访问 Onlook | 外部浏览器 |
| 入口 3 | Cursor 仅 | IDE 中执行命令 → Cursor 内置浏览器 | Cursor 内置浏览器 |

---

## 二、Phase 完成度总览

| Phase | 名称 | 完成度 | 状态 |
|-------|------|--------|------|
| Phase 0 | 数据模型改造 | **95%** | ✅ 基本完成 |
| Phase 1 | VSCode 扩展核心 | **90%** | ✅ 核心功能完成，缺少 URI 细节 |
| Phase 2 | Dev Server 与项目管理 | **85%** | ✅ 基本可用，端口冲突需优化 |
| Phase 3 | LocalProvider 实现 | **75%** | ⚠️ 核心完成，git/copy 等待补 |
| Phase 4 | Web UI 改造 | **70%** | ⚠️ 入口2已通，入口1/3未完成 |
| Phase 5 | Cursor 内置浏览器适配 | **30%** | ❌ 仅有降级逻辑，未测试 |
| Phase 6 | 测试与优化 | **5%** | ❌ 未开始 |

---

## 三、已完成功能详细清单

### 3.1 数据模型（Phase 0）— 完成 ✅

| 功能 | 状态 | 备注 |
|------|------|------|
| `ProjectEnvironment` 枚举 | ✅ | SANDBOX / LOCAL_VSCODE |
| Branch model 双环境 | ✅ | sandbox 可选，新增 environment/localPath/devServerPort |
| DB schema 变更 | ✅ | sandboxId 可选，新列有默认值 |
| Mapper 双向映射 | ✅ | fromDbBranch/toDbBranch 适配 |
| Default factory | ✅ | 自动推断环境类型 |
| tRPC API 适配 | ✅ | project.create 支持 environment |
| Branch router 适配 | ✅ | fork/createBlank 兼容 |
| Seed 数据 | ✅ | 补充新字段 |
| 兼容性保障 | ✅ | 现有数据默认 sandbox，零影响 |

### 3.2 VSCode 扩展（Phase 1+2）— 完成 ✅

| 功能 | 状态 | 实现位置 |
|------|------|---------|
| 扩展入口（activate/deactivate） | ✅ | extension.ts |
| WebSocket 服务器 | ✅ | agent-server.ts |
| HTTP 健康检查 `/health` | ✅ | agent-server.ts |
| Token 生成 `/token` | ✅ | agent-server.ts |
| 握手认证 | ✅ | agent-server.ts:handleHandshake |
| 消息分发 | ✅ | agent-server.ts:dispatchMessage |
| URI Handler（vscode://onlook.onlook-local） | ✅ | agent-server.ts:handleUri |
| 安全管理（Token TTL、域名白名单） | ✅ | security.ts |
| 通信协议定义 | ✅ | protocol.ts（24 methods, 6 events） |
| 文件操作（7 种） | ✅ | file-ops.ts |
| 文件监听（chokidar） | ✅ | file-watcher.ts |
| Dev Server 管理 | ✅ | dev-server.ts |
| 端口自动分配 | ✅ | dev-server.ts（集成） |
| 项目创建（create-next-app） | ✅ | project-manager.ts |
| Preload script 注入 | ✅ | preload-inject.ts |
| 终端管理 | ✅ | terminal-manager.ts |
| IDE 启动器（外部/内置浏览器） | ✅ | ide-launcher.ts |
| 状态栏指示器 | ✅ | extension.ts |
| 配置变更监听 | ✅ | extension.ts |

### 3.3 LocalProvider（Phase 3）— 核心完成 ⚠️

| 功能 | 状态 | 备注 |
|------|------|------|
| WebSocket 客户端 | ✅ | 内联于 LocalProvider |
| 连接/重连/心跳 | ✅ | 指数退避重连 |
| 文件 CRUD | ✅ | read/write/delete/list/rename/stat/mkdir |
| 文件监听 | ✅ | LocalFileWatcher |
| 终端操作 | ✅ | LocalTerminal |
| Dev Server 任务 | ✅ | LocalTask |
| 背景命令 | ✅ | LocalBackgroundCommand |
| 请求-响应模式 | ✅ | 30s 超时，自动清理 |
| 推送事件处理 | ✅ | 5 种事件类型 |
| Provider 工厂集成 | ✅ | CodeProvider.Local |
| gitStatus() | ❌ | 返回空 stub |
| copyFiles() | ⚠️ | read+write 模拟，非原生 |
| createProject() | ❌ | 抛错，委托扩展 |
| runCommand() | ⚠️ | 通过临时终端执行，无输出 |
| createSession()/setup() | ❌ | 空 stub |

### 3.4 Web UI（Phase 4）— 入口2已通 ⚠️

| 功能 | 状态 | 备注 |
|------|------|------|
| 项目创建 Top Bar 下拉（Sandbox/Local） | ✅ | top-bar.tsx |
| 本地扩展在线检测（绿/灰指示器） | ✅ | top-bar.tsx + local-agent.ts |
| 项目卡片环境徽章 | ✅ | project-card.tsx |
| URL 参数自动连接 | ✅ | page.tsx + useLocalAgentAutoConnect |
| Frame URL 适配（localhost vs sandbox） | ✅ | view.tsx:resolveFrameUrl |
| Dev Server 端口回写 | ✅ | session.ts:onDevServerStatus |
| 入口 2：IDE 打开浏览器 → 连接 | ✅ | 已打通 |
| 入口 1：Web → URI 打开 IDE | ❌ | URI 生成逻辑缺失 |
| 入口 3：Cursor 内置浏览器 | ❌ | 仅有降级代码 |
| 错误状态 UI | ⚠️ | 缺少用户可见的连接失败提示 |
| 模板选择支持本地 | ❌ | template-modal 仅支持 Sandbox |

---

## 四、架构正确性审查

### 4.1 架构优势 ✅

1. **Provider 抽象正确**：`CodeProviderSync → Provider` 的设计允许无缝切换 Sandbox 和 Local 模式，这是最核心的架构决策，实现正确。

2. **通信协议对齐**：LocalProvider 的方法名与扩展端 AgentMethods 常量一一对应，消息格式统一（AgentMessage），确保两端协议一致。

3. **数据模型兼容**：`environment` 默认 `'sandbox'`，`sandboxId` 改为可选，现有数据零影响，向后兼容策略正确。

4. **事件驱动**：扩展端通过 `broadcastEvent` 推送，Web 端通过回调接收，文件变更、Dev Server 状态等实时通知机制完整。

5. **安全设计**：Token 握手 + 域名白名单 + localhost 绑定，多层防护合理。

### 4.2 架构问题 ❌

#### 问题 1：Dev Server 端口分配与回写的时序竞争（严重）

**现象**：
- SandboxManager.initLocal() 先启动 LocalProvider，再通过 `reaction` 监听 provider → 自动启动 dev server
- SessionManager.startLocal() 中有 `onDevServerStatus` 回调更新 `branch.devServerPort`
- 但是 Frame URL 的 `resolveFrameUrl()` 读取的是 `branch.devServerPort`
- **Dev Server 从启动到端口确定有时间差**，期间 Frame URL 默认指向 `localhost:3001`

**影响**：Canvas iframe 可能先加载 localhost:3001（默认值），等 dev server 实际启动在 3004 后，iframe 不会自动更新。

**根因**：端口信息需要"先启动 dev server → 等待端口确定 → 再更新 Frame URL"的异步链路，但当前 Frame 加载是同步的。

**建议修复**：
- Frame view 应该监听 `branch.devServerPort` 的变化（MobX reaction），端口更新后自动 reload iframe
- 或者：SandboxManager 在 dev server 端口确定前不设置 Frame URL，显示"等待 Dev Server 启动"状态

#### 问题 2：WebSocket 端口发现机制脆弱（中等）

**现象**：
- 扩展启动时尝试 `configPort`，失败后只尝试 `configPort + 1`（2 次机会）
- Web 端硬编码扫描 9527/9528/9529 三个端口
- 如果扩展实际启动在 9530+，Web 端无法发现

**建议修复**：
- 扩展启动后写入端口到某个已知位置（如 `.onlook-port` 文件或 VSCode globalState）
- 或扩展端支持端口范围扫描（如 9527-9537）
- 或 Web 端通过 URL 参数精确传入端口（入口2已部分实现）

#### 问题 3：FileOpsManager 的 projectPath 是共享状态（中等）

**现象**：
- `fileOpsManager.projectPath` 在握手时设置，多个客户端连接时后连接的会覆盖
- 同理 `fileWatcherManager.projectPath` 也会被覆盖

**影响**：如果同时打开多个项目（多个 Web 客户端连接同一扩展），文件操作路径会混乱。

**建议修复**：
- 将 `projectPath` 绑定到 `ConnectedClient` 而非 Manager
- dispatchMessage 时从 `this.clients.get(ws)` 获取 projectPath 并传入

#### 问题 4：LocalProvider 缺少独立的 WebSocket 客户端抽象（轻微）

**现象**：WebSocket 客户端逻辑内联在 LocalProvider（875 行），增加了维护成本。原计划有独立的 `websocket-client.ts`。

**建议**：功能稳定后考虑重构提取，非阻塞。

#### 问题 5：createProject/createProjectFromGit 在 Provider 端抛错（设计正确）

**分析**：这两个静态方法在 LocalProvider 中故意抛错是正确的，因为项目创建由扩展端处理（通过 URI Handler）。Provider 只负责已创建项目的文件操作。

### 4.3 关键 Bug 追踪

根据上一次 session 记录和代码注释：

| Bug | 严重性 | 描述 | 状态 |
|-----|--------|------|------|
| Bug-0416 | 高 | 入口2基本打通但仍有 bug，可能是端口/连接问题 | 未解决 |
| 端口冲突 | 高 | Dev Server 启动时端口可能已被占用，当前只尝试 +1 | 部分修复 |
| Frame 不刷新 | 中 | devServerPort 更新后 Canvas iframe 不自动刷新 | 未解决 |
| 多客户端路径 | 中 | FileOpsManager/FIleWatcherManager 的 projectPath 共享 | 未解决 |

---

## 五、未完成功能清单（按优先级排序）

### P0 — 核心功能缺失

| # | 功能 | 当前状态 | 需要 | 影响 |
|---|------|---------|------|------|
| 1 | **Frame URL 动态更新** | 静态读取 branch.devServerPort | 监听端口变化后 reload iframe | Canvas 无法正确显示本地项目 |
| 2 | **Dev Server 端口冲突健壮性** | 仅尝试 3001 和 3001+1 | 循环尝试多个端口，更新回数据库 | 项目无法启动 |
| 3 | **WebSocket 端口发现** | 硬编码 9527-9529 | 动态发现或通过参数传入 | Web 无法连接扩展 |

### P1 — 入口完整性

| # | 功能 | 当前状态 | 需要 | 影响 |
|---|------|---------|------|------|
| 4 | **入口 1：Web → URI → IDE** | URI 生成逻辑缺失（CreateManager.startCreateLocal 中 TODO） | 生成 vscode:// URI 并触发 | 入口1不可用 |
| 5 | **入口 3：Cursor 内置浏览器** | ide-launcher 有降级逻辑，未测试 | 集成测试 + 降级策略 | 入口3不可用 |
| 6 | **错误状态 UI** | 连接失败仅 console.error | 用户可见的 Toast/状态指示器 | 用户体验差 |

### P2 — 功能完善

| # | 功能 | 当前状态 | 需要 | 影响 |
|---|------|---------|------|------|
| 7 | **gitStatus() 实现** | 返回空 stub | 实现或委托扩展 | Git 面板不可用 |
| 8 | **copyFiles 原生支持** | read+write 模拟 | 扩展端新增 file.copy 方法 | 大文件复制慢 |
| 9 | **FileOpsManager 多客户端隔离** | 共享 projectPath | 绑定到 ConnectedClient | 多项目并发会混乱 |
| 10 | **模板选择支持本地** | 仅 Sandbox | 本地模板（create-next-app 参数） | 本地项目只能空白创建 |
| 11 | **runCommand 输出** | 通过临时终端执行无输出 | 实现输出捕获 | CLI 交互受限 |

### P3 — 体验优化

| # | 功能 | 当前状态 | 需要 | 影响 |
|---|------|---------|------|------|
| 12 | **连接断开自动重连 UI** | Provider 有重连但无 UI | 断开提示 + 自动重连指示器 | 用户不知连接状态 |
| 13 | **项目模板系统** | 硬编码 Next.js | 可扩展模板 | 仅支持 Next.js |
| 14 | **Dev Server 日志查看** | 扩展端有 stdout/stderr 捕获 | Web 端展示 | 调试不便 |
| 15 | **跨平台测试** | 仅 macOS 验证 | Windows/Linux 测试 | 其他平台可能有问题 |

---

## 六、下一步建议

### 立即行动（P0）

1. **修复 Frame URL 动态更新**：在 Frame view 中添加 MobX reaction 监听 `branch.devServerPort`，变化时 reload iframe
2. **修复端口冲突**：DevServerManager.allocatePort 循环尝试 3001-3100，成功后更新 DB
3. **修复 WebSocket 端口发现**：扩展端将端口写入 globalState；Web 端增加更宽的扫描范围

### 短期（P1，1-2 周）

4. **实现入口 1**：CreateManager.startCreateLocal 生成 `vscode://onlook.onlook-local/createProject?token=xxx&projectId=xxx` URI
5. **添加错误 UI**：连接失败 Toast、Dev Server 启动中 loading 状态
6. **测试入口 3**：Cursor 内置浏览器集成测试

### 中期（P2，2-4 周）

7. **多客户端隔离**：FileOpsManager 绑定 projectPath 到客户端
8. **gitStatus 实现**：扩展端新增 git 操作方法
9. **本地模板选择**：template-modal 支持本地环境

---

## 七、架构整体评价

**评分：7.5/10**

**优势**：
- Provider 抽象层设计优秀，Sandbox/Local 切换对上层透明
- 通信协议完整且双向对齐
- 安全机制多层防护
- 数据模型向后兼容

**短板**：
- 异步时序问题（端口分配、Frame URL 更新）需要更仔细的竞态处理
- 多客户端场景考虑不足
- 错误反馈链路不完整（后端有日志，前端无提示）
- 入口 1/3 未实现，仅入口 2 基本可用

**结论**：核心架构正确，Phase 0-2 质量较高。当前最关键的是解决 P0 的端口/Frame 刷新问题，然后补齐入口 1。项目处于"核心可用但体验不完整"的阶段。
