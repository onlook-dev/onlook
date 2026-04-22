# Phase 2+3 端到端测试文档

> 完成日期：2026-04-15
> 前置 Phase：Phase 0（数据模型）、Phase 1（扩展基础框架）

## 测试目标

验证 VSCode 扩展的完整功能（Dev Server、终端、Preload Script、文件操作）以及 Web 端 LocalProvider 的 WebSocket 通信集成。

---

## 测试前置条件

1. VSCode/Cursor 已安装 Onlook 扩展（F5 启动扩展开发宿主或打包安装）
2. Onlook Web 可访问（本地 `bun run dev` 或部署地址）
3. 本地有一个可用的 Next.js 项目（或通过扩展创建）

---

## 第一部分：扩展端独立测试

### E2E-P2-001：Dev Server 启动与停止

**目的：** 验证 DevServerManager 可正确启动和停止 Next.js dev server

**步骤：**
1. 在 VSCode 中打开一个 Next.js 项目
2. 通过 WebSocket 客户端连接扩展（ws://localhost:9527）
3. 发送握手请求（带 token）
4. 发送 `devServer.start` 请求：
   ```json
   {
     "id": "1",
     "type": "request",
     "method": "devServer.start",
     "params": { "projectPath": "/Users/easonchan/Documents/Onlook/Projects/project-1775715722408" }
   }
   ```
5. 等待响应，记录分配的端口号
6. 浏览器访问 `http://localhost:<port>`，验证页面加载
7. 发送 `devServer.stop` 请求
   ```json
   {
     "id": "1",
     "type": "request",
     "method": "devServer.stop",
     "params": { "projectPath": "/Users/easonchan/Documents/Onlook/Projects/project-1775715722408" }
   }
   ```
8. 验证页面不可访问

**预期结果：**
- `devServer.start` 返回 `{ port: 3000, status: 'running' }`
- 浏览器可访问 Next.js 应用
- 收到 `devServer.status` 事件推送，status 依次为 `starting` → `running`
- `devServer.stop` 返回 `{ success: true }`
- 页面不再可访问
- 收到 `devServer.status` 事件，status 为 `stopped`

---

### E2E-P2-002：Dev Server 端口冲突处理

**目的：** 验证端口被占用时自动分配下一个可用端口

**步骤：**
1. 手动占用端口 3000（如启动另一个服务）
2. 发送 `devServer.start` 请求，`preferredPort: 3000`
3. 验证返回的端口不是 3000

**预期结果：**
- 返回的 port 为 3001 或更大的可用端口
- Next.js dev server 在新端口正常启动

---

### E2E-P2-003：终端管理

**目的：** 验证 TerminalManager 的创建、写入、终止功能

**步骤：**
1. 发送 `terminal.create` 请求：
   ```json
   { "id": "t1", "type": "request", "method": "terminal.create", "params": { "cwd": "/Users/easonchan/Documents/Onlook/Projects/project-1775715722408" } }
   ```
2. 记录返回的 `terminalId`
3. 发送 `terminal.write` 请求：
   ```json
   { "id": "t2", "type": "request", "method": "terminal.write", "params": { "terminalId": "term_1776232265616", "data": "echo hello" } }
   ```
4. 在 VSCode 中验证终端显示 "echo hello"
5. 发送 `terminal.kill` 请求
   ```json
   { "id": "t1", "type": "request", "method": "terminal.kill", "params": { "cwd": "/Users/easonchan/Documents/Onlook/Projects/project-1775715722408" } }
   ```

**预期结果：**
- 终端创建成功，VSCode 中出现新终端
- 写入命令后终端执行
- 终止后终端关闭

---

### E2E-P2-004：Preload Script 注入

**目的：** 验证创建项目后 preload script 自动注入

**步骤：**
1. 发送 `project.create` 请求，创建一个新 Next.js 项目
2. 等待项目创建完成
3. 检查项目的 `public/onlook-preload-script.js` 文件是否存在
4. 检查项目的 `src/app/layout.tsx` 是否包含：
   - `import Script from 'next/script'`
   - `/* onlook-preload-script-injected */`
   - `<Script src="/onlook-preload-script.js" strategy="beforeInteractive" />`

**预期结果：**
- `public/onlook-preload-script.js` 文件存在
- layout.tsx 包含 Script 标签注入
- 项目可正常启动（`npm run dev` 不报错）

---

### E2E-P2-005：Preload Script 移除

**目的：** 验证 PreloadScriptInjector.remove() 可正确清理注入

**步骤：**
1. 对已注入的项目调用 `injector.remove(projectPath)`
2. 检查 `public/onlook-preload-script.js` 是否已删除
3. 检查 layout.tsx 是否已恢复原始内容（无 Script 标签和 import）

**预期结果：**
- preload script 文件已删除
- layout.tsx 中无注入痕迹

---

### E2E-P2-006：状态栏指示器

**目的：** 验证扩展激活后状态栏显示连接状态

**步骤：**
1. 启动扩展
2. 检查状态栏右下角是否有 Onlook 图标
3. 点击状态栏图标
4. 验证显示连接信息

**预期结果：**
- 状态栏显示 `Onlook :9527`（或实际端口）
- 点击后显示详细信息（端口、客户端数量）

---

### E2E-P2-007：配置变更提示

**目的：** 验证修改 onlook.agentPort 或 onlook.allowedOrigins 后提示重新加载

**步骤：**
1. 打开 VSCode 设置
2. 修改 `onlook.agentPort` 的值
3. 观察是否弹出提示

**预期结果：**
- 弹出信息提示："Onlook 配置已更改，重新加载窗口以生效"
- 点击"重新加载"后窗口重新加载

---

### E2E-P2-008：扩展停用清理

**目的：** 验证停用扩展时所有资源正确清理

**步骤：**
1. 启动扩展
2. 创建终端
3. 启动 Dev Server
4. 连接 WebSocket 客户端
5. 停用扩展（或关闭 VSCode）
6. 验证 dev server 进程已终止
7. 验证 WebSocket 服务器已关闭

**预期结果：**
- Dev Server 进程已终止（`lsof -i :3000` 无结果）
- WebSocket 连接已关闭
- 终端已关闭
- 状态栏项已移除

---

## 第二部分：Web 端 LocalProvider 集成测试

### E2E-P3-001：LocalProvider WebSocket 连接

**目的：** 验证 Web 端可通过 LocalProvider 连接扩展的 WebSocket 服务器

**步骤：**
1. 启动 VSCode 扩展
2. 在浏览器中打开 Onlook Web，URL 带上参数：
   ```
   http://localhost:3000/project/<id>?localAgent=9527&token=<有效token>&workspacePath=/path/to/project&ide=vscode
   ```
3. 打开浏览器控制台，观察连接日志

**预期结果：**
- 控制台显示 `[SessionManager] 连接本地 VSCode 扩展: ws://localhost:9527`
- 控制台显示 `[SessionManager] 本地 VSCode 扩展连接成功`
- LocalProvider 的 `state` 为 `CONNECTED`

---

### E2E-P3-002：LocalProvider 文件读取

**目的：** 验证通过 LocalProvider 读取本地文件

**步骤：**
1. 已连接 LocalProvider（E2E-P3-001 前置）
2. 在 Onlook Web 中打开项目
3. 在 Canvas 中查看项目文件
4. 在左侧文件树中浏览文件

**预期结果：**
- 文件树正确显示本地项目文件
- 点击文件可查看内容
- CodeProviderSync 正常同步文件到内存文件系统

---

### E2E-P3-003：LocalProvider 文件写入与同步

**目的：** 验证通过 LocalProvider 修改文件后本地文件更新

**步骤：**
1. 已连接 LocalProvider
2. 在 Onlook Web 的代码编辑器中修改某个文件
3. 保存文件
4. 检查本地磁盘上文件是否已更新

**预期结果：**
- 本地文件内容与 Web 端修改一致
- 无报错

---

### E2E-P3-004：LocalProvider 文件监听

**目的：** 验证本地文件变更时 Web 端收到通知

**步骤：**
1. 已连接 LocalProvider
2. 在 VSCode 中手动修改项目文件
3. 观察 Web 端是否自动刷新

**预期结果：**
- 扩展端检测到文件变更
- 推送 `file.changed` 事件到 Web 端
- CodeProviderSync 更新内存文件系统
- Canvas 中预览更新（如果 dev server 在运行）

---

### E2E-P3-005：LocalProvider 自动重连

**目的：** 验证 WebSocket 断开后自动重连

**步骤：**
1. 已连接 LocalProvider
2. 重启 VSCode 扩展（使 WebSocket 服务器暂时不可用）
3. 等待扩展重新启动
4. 观察 Web 端是否自动重连

**预期结果：**
- 控制台显示 `[LocalProvider] WebSocket 连接错误` 或 `onclose`
- 重连尝试开始，指数退避
- 扩展重新启动后，LocalProvider 自动重连成功
- 文件操作恢复正常

---

### E2E-P3-006：Dev Server 启动（从 Web 端）

**目的：** 验证从 Web 端通过 LocalProvider 启动本地 Dev Server

**步骤：**
1. 已连接 LocalProvider
2. 在 Onlook Web 中触发 dev server 启动（如通过终端面板）
3. 等待 dev server 就绪
4. 验证 Canvas iframe 加载项目预览

**预期结果：**
- Dev Server 启动成功
- 收到 `devServer.status` 事件推送
- Canvas 加载 `http://localhost:<port>` 的预览

---

### E2E-P3-007：终端操作（从 Web 端）

**目的：** 验证从 Web 端创建和操作本地终端

**步骤：**
1. 已连接 LocalProvider
2. 在 Onlook Web 的终端面板中执行命令
3. 验证 VSCode 终端显示命令输出

**预期结果：**
- VSCode 中创建新终端
- 命令在终端中执行
- Web 端收到终端输出事件（如果扩展端支持输出推送）

---

### E2E-P3-008：入口 2 完整流程（VSCode → 外部浏览器）

**目的：** 验证从 VSCode 打开 Onlook Web 的完整入口 2 流程

**步骤：**
1. 在 VSCode 中打开一个 Next.js 项目
2. 执行命令 `Onlook: Open in Browser`
3. 浏览器打开 Onlook Web（带 localAgent/token/workspacePath 参数）
4. 在 Onlook Web 中浏览项目文件
5. 修改文件并保存
6. 验证本地文件更新

**预期结果：**
- 浏览器正确打开 Onlook Web
- URL 包含 localAgent、token、workspacePath、ide 参数
- LocalProvider 连接成功
- 文件操作正常
- 修改同步到本地

---

### E2E-P3-009：入口 3 完整流程（Cursor → 内置浏览器）

**目的：** 验证在 Cursor 中通过内置浏览器打开 Onlook Web 的入口 3 流程

**步骤：**
1. 在 Cursor 中打开一个 Next.js 项目
2. 执行命令 `Onlook: Open in Browser`
3. 验证在 Cursor 内置浏览器中打开 Onlook Web
4. 在 Onlook Web 中浏览项目

**预期结果：**
- Onlook Web 在 Cursor 内置浏览器中打开（而非外部浏览器）
- URL 包含 `ide=cursor` 参数
- LocalProvider 连接成功
- 文件操作正常

---

## 第三部分：边界与错误场景

### E2E-P2-P3-001：无效 Token 连接

**目的：** 验证使用无效 token 无法通过握手验证

**步骤：**
1. 在浏览器中打开 Onlook Web，URL 带上无效 token：
   ```
   ?localAgent=9527&token=invalid-token&workspacePath=/path
   ```
2. 观察连接结果

**预期结果：**
- WebSocket 连接建立但握手失败
- 收到错误响应：`{ error: { code: 4003, message: 'Invalid token' } }`
- 连接被关闭

---

### E2E-P2-P3-002：扩展未启动时 Web 端行为

**目的：** 验证扩展未启动时 Web 端的降级行为

**步骤：**
1. 确保扩展未运行（端口 9527 无服务）
2. 打开带 localAgent 参数的 Onlook Web
3. 观察错误处理

**预期结果：**
- WebSocket 连接失败
- SessionManager 捕获错误，不崩溃
- 页面显示错误提示或等待状态
- 扩展启动后可重连

---

### E2E-P2-P3-003：多文件同时修改

**目的：** 验证并发文件修改不会导致数据丢失

**步骤：**
1. 已连接 LocalProvider
2. 在 Onlook Web 中同时修改多个文件
3. 保存所有修改
4. 检查本地文件是否全部更新

**预期结果：**
- 所有修改的文件内容正确
- 无文件损坏或内容丢失

---

## 测试结果记录

| 用例 | 状态 | 备注 |
|------|------|------|
| E2E-P2-001 | 待测 | 需要 Next.js 项目 |
| E2E-P2-002 | 待测 | |
| E2E-P2-003 | 待测 | |
| E2E-P2-004 | 待测 | |
| E2E-P2-005 | 待测 | |
| E2E-P2-006 | 待测 | |
| E2E-P2-007 | 待测 | |
| E2E-P2-008 | 待测 | |
| E2E-P3-001 | 待测 | |
| E2E-P3-002 | 待测 | |
| E2E-P3-003 | 待测 | |
| E2E-P3-004 | 待测 | |
| E2E-P3-005 | 待测 | |
| E2E-P3-006 | 待测 | |
| E2E-P3-007 | 待测 | |
| E2E-P3-008 | 待测 | 完整入口 2 流程 |
| E2E-P3-009 | 待测 | 完整入口 3 流程，需 Cursor |
| E2E-P2-P3-001 | 待测 | |
| E2E-P2-P3-002 | 待测 | |
| E2E-P2-P3-003 | 待测 | |

---

## 注意事项

1. **Token 有效期**：SecurityManager 生成的 token 有效期为 5 分钟，测试时需注意时效
2. **端口可用性**：测试前确保 9527 端口未被占用
3. **终端输出限制**：当前 TerminalManager 不支持读取终端输出，E2E-P3-007 的输出推送功能受限
4. **Cursor 内置浏览器**：E2E-P3-009 需要在 Cursor IDE 中测试，VSCode 不支持该功能
5. **WebSocket 重连间隔**：首次 1 秒，指数退避到最大 30 秒，测试重连时需耐心等待
