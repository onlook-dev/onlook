# Phase 1 端到端测试文档

> 完成日期：2026-04-15

## 测试前置条件

1. VSCode 或 Cursor 已安装
2. 扩展已编译并安装（`cd apps/vscode-extension && npm run build`，然后通过 VSIX 安装或 F5 调试）
3. Node.js 环境可用（用于 `npx create-next-app`）

---

## 测试用例

### E2E-P1-001：扩展激活与 WebSocket 服务器启动

**步骤：**
1. 在 VSCode 中安装并激活 Onlook 扩展
2. 打开命令面板，执行 `Onlook: Show Connection Status`

**预期结果：**
- 输出面板显示 `[Onlook] 扩展激活`
- 输出面板显示 `[Onlook] WebSocket 服务器已启动，端口: 9527`
- 状态命令显示 `[Onlook] WebSocket 服务器运行中，端口: 9527`

---

### E2E-P1-002：健康检查端点

**步骤：**
1. 扩展激活后，在终端执行：
   ```bash
   curl http://localhost:9527/health
   ```

**预期结果：**
```json
{
  "status": "ok",
  "port": 9527,
  "clients": 0,
  "version": "0.1.0"
}
```

---

### E2E-P1-003：WebSocket 握手验证（成功）

**步骤：**
1. 在扩展中注册 token：通过 URI `vscode://onlook.connect?token=test-token-123`：
   在浏览器/终端打开 vscode://onlook.connect?token=test-token-123，VSCode 会收到并注册这个 token（本地启动onlook需要替换上面的域名）；
   在 VSCode 中执行 Onlook: Open in Browser 命令，扩展会自动生成一个 token 并注册（ideLauncher.openOnlook() → security.registerToken()），然后构造带 token 的 URL 打开浏览器；
2. 使用 wscat 或类似工具连接：
   ```bash
   wscat -c ws://localhost:9527
   ```
3. 发送握手消息：
   ```json
   {"id":"1","type":"request","method":"connect.handshake","params":{"token":"test-token-123"}}
   ```

**预期结果：**
- 收到成功响应：
  ```json
  {"id":"1","type":"response","method":"connect.handshake","result":{"success":true,"port":9527}}
  ```

---

### E2E-P1-004：WebSocket 握手验证（失败 - 无效 Token）

**步骤：**
1. 连接 WebSocket
2. 发送无效 token 的握手消息：
   ```json
   {"id":"1","type":"request","method":"connect.handshake","params":{"token":"invalid-token"}}
   ```

**预期结果：**
- 收到错误响应：
  ```json
  {"id":"1","type":"response","method":"connect.handshake","error":{"code":4003,"message":"Invalid token"}}
  ```
- 连接被关闭

---

### E2E-P1-005：文件读取操作

**步骤：**
1. 握手成功后，发送文件读取请求：
   ```json
   {
     "id":"2",
     "type":"request",
     "method":"file.read",
     "params":{"path":"/Users/easonchan/Documents/Onlook/Projects/project-1775715722408/README.md"}
   }
   ```

**预期结果：**
- 收到文件内容响应：
  ```json
  {
    "id":"2",
    "type":"response",
    "method":"file.read",
    "result":{"content":"<文件内容>","type":"text","path":"/path/to/some/file.ts"}
  }
  ```

---

### E2E-P1-006：文件写入操作

**步骤：**
1. 握手成功后，发送文件写入请求：
   ```json
   {
     "id":"3",
     "type":"request",
     "method":"file.write",
     "params":{"path":"/tmp/test-write.txt","content":"Hello Onlook!"}
   }
   ```

**预期结果：**
- 收到成功响应
- 文件 `/tmp/test-write.txt` 已创建，内容为 "Hello Onlook!"

---

### E2E-P1-007：文件列表操作

**步骤：**
1. 发送目录列表请求：
   ```json
   {
     "id":"4",
     "type":"request",
     "method":"file.list",
     "params":{"path":"/Users/easonchan/Documents/浩鲸/AI分享"}
   }
   ```

**预期结果：**
- 收到文件列表响应，包含 `files` 数组，每项有 `name`、`type`、`isSymlink`

---

### E2E-P1-008：文件监听

**步骤：**
1. 发送文件监听请求：
   ```json
   {
     "id":"5",
     "type":"request",
     "method":"file.watch.start",
     "params":{"path":"/Users/easonchan/Documents/Onlook/Projects/project-1775715722408/README.md","recursive":true}
   }
   ```
2. 在项目目录中修改一个文件

**预期结果：**
- 收到监听注册响应，包含 `watchId`
- 文件变更后收到推送事件：
  ```json
  {"id":"","type":"event","method":"file.changed","params":{"type":"change","path":"/path/to/changed/file.ts"}}
  ```

---

### E2E-P1-009：URI Handler - 连接

**步骤：**
1. 在浏览器或终端打开 URI：
   ```
   vscode://onlook.connect?token=my-token&projectId=xxx&origin=http://172.16.85.110:9000
   ```

**预期结果：**
- VSCode 窗口获得焦点
- 显示信息提示：`[Onlook] 正在等待 Web 客户端连接 (端口: 9527)...`
- Token 已注册，可通过 WebSocket 握手使用

---

### E2E-P1-010：URI Handler - 创建项目

**步骤：**
1. 打开 URI：
   ```
   vscode://onlook.createProject?name=test-app&parentPath=/tmp&token=xxx
   ```

**预期结果：**
- 执行 `npx create-next-app` 创建项目
- 项目创建成功后自动在 VSCode 中打开

---

### E2E-P1-011：命令 - 在浏览器中打开 Onlook（VSCode）

**步骤：**
1. 在 VSCode 中执行 `Onlook: Open in Browser`

**预期结果：**
- 在默认浏览器中打开 Onlook Web URL
- URL 包含 `localAgent`、`token`、`ide=vscode` 参数

---

### E2E-P1-012：命令 - 在浏览器中打开 Onlook（Cursor）

**步骤：**
1. 在 Cursor 中执行 `Onlook: Open in Browser`

**预期结果：**
- 在 Cursor 内置浏览器中打开 Onlook Web URL
- 如果内置浏览器失败，降级为外部浏览器
- URL 包含 `ide=cursor` 参数

---

### E2E-P1-013：Ping/Pong 心跳

**步骤：**
1. 握手成功后，发送 ping：
   ```json
   {"id":"6","type":"request","method":"connect.ping"}
   ```

**预期结果：**
- 收到 pong 响应，包含 `timestamp`

---

### E2E-P1-014：未认证消息拒绝

**步骤：**
1. 连接 WebSocket（不发送握手）
2. 直接发送文件读取请求

**预期结果：**
- 收到错误响应：`Not authenticated, send handshake first`

---

### E2E-P1-015：端口冲突处理

**步骤：**
1. 手动占用端口 9527（如 `nc -l 9527`）
2. 激活 Onlook 扩展

**预期结果：**
- 扩展自动尝试端口 9528
- 日志显示端口冲突警告

---

## 测试结果记录

| 用例 | 状态 | 备注 |
|------|------|------|
| E2E-P1-001 | 待测 | |
| E2E-P1-002 | 待测 | |
| E2E-P1-003 | 待测 | 需要 wscat 工具 |
| E2E-P1-004 | 待测 | |
| E2E-P1-005 | 待测 | |
| E2E-P1-006 | 待测 | |
| E2E-P1-007 | 待测 | |
| E2E-P1-008 | 待测 | |
| E2E-P1-009 | 待测 | |
| E2E-P1-010 | 待测 | |
| E2E-P1-011 | 待测 | |
| E2E-P1-012 | 待测 | 需要 Cursor |
| E2E-P1-013 | 待测 | |
| E2E-P1-014 | 待测 | |
| E2E-P1-015 | 待测 | |

---

## 手动测试指南

### 快速启动测试

1. **编译扩展：**
   ```bash
   cd apps/vscode-extension
   npm run build
   ```

2. **F5 调试：**
   - 在 VSCode 中打开 `apps/vscode-extension` 目录
   - 按 F5 启动扩展开发宿主
   - 在新窗口中测试

3. **WebSocket 测试工具：**
   ```bash
   # 安装 wscat
   npm install -g wscat

   # 连接测试
   wscat -c ws://localhost:9527
   ```

4. **健康检查：**
   ```bash
   curl http://localhost:9527/health
   ```
