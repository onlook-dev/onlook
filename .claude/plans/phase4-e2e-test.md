# Phase 4 端到端测试文档

> 更新日期：2026-04-15
> 变更：适配 .vsix 本地安装流程 + token 动态获取机制

## 测试目标

验证 Web UI 改造后，本地 VSCode 项目的创建、显示、Frame URL 适配等端到端功能。

---

## 测试前置条件

1. VSCode/Cursor 已通过 .vsix 安装 Onlook 扩展且正在运行
   ```bash
   cursor --install-extension apps/vscode-extension/onlook-local-0.1.0.vsix
   # 或
   code --install-extension apps/vscode-extension/onlook-local-0.1.0.vsix
   ```
2. Onlook Web 可访问（本地 dev server 或部署地址）
3. 数据库已执行 `bun run db:push`

---

## 测试用例

### E2E-P4-001：扩展安装验证（新增）

**目的：** 验证 .vsix 安装后扩展功能正常

**步骤：**
1. 运行 `cursor --install-extension onlook-local-0.1.0.vsix`
2. 重启 Cursor
3. 按 `Cmd+Shift+P`，搜索 "Onlook"
4. 查看状态栏是否显示 `Onlook :9527`

**预期结果：**
- 命令面板中能看到 4 个 Onlook 命令
- 状态栏显示 `$(radio-tower) Onlook :9527`
- 浏览器访问 `http://localhost:9527/health` 返回 `{ "status": "ok", ... }`

---

### E2E-P4-002：本地扩展健康检测

**目的：** 验证 detectLocalAgent() 可正确检测扩展在线/离线状态

**步骤：**
1. 启动扩展（IDE 已安装 .vsix）
2. 在浏览器控制台执行：
   ```javascript
   fetch('http://localhost:9527/health').then(r => r.json()).then(console.log)
   ```
3. 关闭 IDE（扩展随之停止）
4. 再次执行检测

**预期结果：**
- 扩展运行时：`{ status: 'ok', port: 9527, version: '0.1.0', clients: N }`
- 扩展停止时：fetch 失败或超时

---

### E2E-P4-003：Token 动态获取（新增）

**目的：** 验证 Web 端可以通过 /token 端点获取连接 token

**步骤：**
1. 启动扩展
2. 在浏览器控制台执行：
   ```javascript
   fetch('http://localhost:9527/token?projectId=test-123').then(r => r.json()).then(console.log)
   ```
3. 用获取的 token 尝试 WebSocket 握手

**预期结果：**
- `/token` 返回 `{ token: "<uuid>" }`
- 使用该 token 通过 WebSocket 发送 `connect.handshake` 可以成功认证
- 使用错误的 token 发送握手被拒绝（返回 4003）

---

### E2E-P4-004：项目创建下拉菜单显示

**目的：** 验证 TopBar 下拉菜单正确显示环境分类和在线状态

**步骤：**
1. 启动扩展
2. 打开 Onlook Web 项目列表页面
3. 点击"Create"按钮
4. 查看下拉菜单内容

**预期结果：**
- 菜单分为两组：Sandbox (Cloud) 和 Local VSCode
- "Sandbox (Cloud)" 下有"Blank Project"
- "Local VSCode" 旁显示绿色圆点（扩展在线）
- "Local VSCode" 下有"Blank Local Project"
- "Import" 选项仍在

---

### E2E-P4-005：创建本地项目（扩展在线）

**目的：** 验证通过"Blank Local Project"创建本地项目（扩展在线 + token 获取）

**步骤：**
1. 启动扩展
2. 打开项目列表页面
3. 点击"Create" → "Blank Local Project"
4. 等待项目创建
5. 观察页面跳转和提示

**预期结果：**
- 代码先调用 `/token` 端点获取 token
- 项目创建成功，跳转到 `?localAgent=9527&token=<token>` 的项目页面
- 浏览器尝试打开 `vscode://onlook.createProject?...` URI（.vsix 安装后可触发扩展）
- 弹出 toast："正在打开 VSCode..."
- 数据库中新项目 branch 的 environment 为 'local_vscode'
- SessionManager 使用 token 成功建立 WebSocket 连接

---

### E2E-P4-006：创建本地项目（扩展离线）

**目的：** 验证扩展离线时创建本地项目的体验

**步骤：**
1. 确保 IDE 未运行（扩展离线）
2. 打开项目列表页面
3. 点击"Create" → "Blank Local Project"

**预期结果：**
- 项目创建成功（数据库记录仍创建）
- "Local VSCode" 旁显示灰色圆点
- 跳转到 `?localAgent=9527` 的项目页面（无 token 参数）
- SessionManager 尝试调用 `/token` 获取 token → 失败（扩展离线）
- 显示错误提示："无法获取连接 token，请确保 VSCode 扩展正在运行"
- toast："本地扩展未检测到，请在 VSCode 中打开项目文件夹，然后执行'Onlook: Open in Browser'命令连接"

---

### E2E-P4-007：入口2 - VSCode → "Open in Browser"（新增）

**目的：** 验证从扩展端打开 Onlook Web 的完整流程

**步骤：**
1. 启动扩展，打开一个项目文件夹
2. 按 `Cmd+Shift+P` → "Onlook: Open in Browser"
3. 观察浏览器打开的 URL

**预期结果：**
- 浏览器打开 URL 包含 `localAgent=9527&token=<token>&workspacePath=<path>` 参数
- Onlook Web 加载后，SessionManager 从 URL 参数读取连接信息
- LocalProvider 成功建立 WebSocket 连接
- 文件树正常加载
- Dev Server 可以启动

---

### E2E-P4-008：vscode:// URI 协议（新增）

**目的：** 验证 .vsix 安装后 URI 协议可以触发扩展

**步骤：**
1. 启动扩展
2. 在浏览器地址栏输入：`vscode: //onlook.onlook-local/connect?token=bb3bbc85-2444-41b8-8dfb-f052c0ae5da9`
3. 观察 IDE 行为

**预期结果：**
- IDE 弹出通知："[Onlook] 正在等待 Web 客户端连接 (端口: 9527)..."
- 扩展注册了该 token

---

### E2E-P4-009：项目卡片环境标识 - Cloud

**目的：** 验证 Sandbox 项目显示 Cloud 标识

**步骤：**
1. 打开项目列表页面
2. 查看已有的 Sandbox 项目卡片

**预期结果：**
- 项目卡片左上角显示蓝色 "☁ Cloud" 标签
- 所有已有项目都显示 Cloud 标签（因为 environment 默认 'sandbox'）

---

### E2E-P4-010：项目卡片环境标识 - Local

**目的：** 验证本地项目显示 Local 标识

**步骤：**
1. 创建一个本地项目（E2E-P4-005）
2. 返回项目列表页面
3. 查看新创建的本地项目卡片

**预期结果：**
- 项目卡片左上角显示紫色 "💻 Local" 标签
- 与其他 Cloud 项目有明显区分

---

### E2E-P4-011：Frame URL 适配 - Sandbox 项目

**目的：** 验证 Sandbox 项目的 Frame URL 不受影响

**步骤：**
1. 打开一个 Sandbox 项目
2. 查看 Canvas 中 iframe 的 src 属性

**预期结果：**
- iframe src 为 CodeSandbox 预览地址（如 `https://xxx-3000.csb.app`）
- 与 Phase 4 改动前完全一致

---

### E2E-P4-012：Frame URL 适配 - Local 项目

**目的：** 验证本地项目的 Frame URL 使用 localhost

**步骤：**
1. 创建本地项目并启动 dev server
2. 打开项目页面
3. 查看 Canvas 中 iframe 的 src 属性

**预期结果：**
- iframe src 为 `http://localhost:{devServerPort}`（如 `http://localhost:3001`）
- 不是 CodeSandbox URL
- 如果 URL 包含路径（如 `/about`），路径被保留：`http://localhost:3001/about`

---

### E2E-P4-013：Frame URL 更新 - devServerPort 变化

**目的：** 验证 devServerPort 更新后 Frame URL 自动变化

**步骤：**
1. 打开一个本地项目
2. 确认 Frame URL 使用端口 3001
3. 停止 dev server，修改 branch 的 devServerPort 为 3002
4. 重新启动 dev server
5. 观察 Frame URL 变化

**预期结果：**
- Frame URL 从 `http://localhost:3001` 变为 `http://localhost:3002`
- 变化通过 MobX 响应式系统自动传播

---

### E2E-P4-014：下拉菜单代理状态实时更新

**目的：** 验证下拉菜单打开时自动检测代理状态

**步骤：**
1. 确保扩展未运行
2. 打开项目列表页面
3. 点击"Create"，观察状态指示器
4. 保持菜单关闭，启动 IDE（扩展随之启动）
5. 重新打开"Create"菜单

**预期结果：**
- 首次打开时显示灰色圆点（离线）
- 扩展启动后重新打开菜单，显示绿色圆点（在线）
- 每次打开菜单时触发新的健康检测

---

## 测试结果记录

| 用例 | 状态 | 备注 |
|------|------|------|
| E2E-P4-001 | 待测 | 新增：.vsix 安装验证 |
| E2E-P4-002 | 待测 | 原 E2E-P4-001 |
| E2E-P4-003 | 待测 | 新增：/token 端点 |
| E2E-P4-004 | 待测 | 原 E2E-P4-002 |
| E2E-P4-005 | 待测 | 原 E2E-P4-003，适配 token 流程 |
| E2E-P4-006 | 待测 | 原 E2E-P4-004，适配离线流程 |
| E2E-P4-007 | 待测 | 新增：入口2 端到端 |
| E2E-P4-008 | 待测 | 新增：URI 协议验证 |
| E2E-P4-009 | 待测 | 原 E2E-P4-005 |
| E2E-P4-010 | 待测 | 原 E2E-P4-006 |
| E2E-P4-011 | 待测 | 原 E2E-P4-007 |
| E2E-P4-012 | 待测 | 原 E2E-P4-008，端口改为 3001 |
| E2E-P4-013 | 待测 | 原 E2E-P4-009 |
| E2E-P4-014 | 待测 | 原 E2E-P4-010 |

---

## 注意事项

1. **CORS 限制**：健康检测和 `/token` 端点已设置 `Access-Control-Allow-Origin: *`，本地开发不受影响。

2. **URI 协议支持**：.vsix 安装后 `vscode://onlook` URI 协议可正常工作。Cursor 也可使用 `cursor://onlook`（需要在 package.json 中额外配置）。

3. **数据库迁移**：测试前确保 `bun run db:push` 已执行，`branches.environment`、`branches.local_path`、`branches.dev_server_port` 列存在。

4. **Dev Server 默认端口**：本地项目的 dev server 默认从 3001 开始（避开 Onlook Web 常用的 3000）。

5. **Token 有效期**：通过 `/token` 端点获取的 token 有效期 5 分钟，超时后需要重新获取。

6. **Frame URL 路径保留**：`resolveFrameUrl()` 会保留原始 URL 中的路径部分（如 `/about`），仅替换 origin。
