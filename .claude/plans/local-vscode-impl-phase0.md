# Phase 0 实施计划：数据模型改造

> 状态：待确认
> 前置方案文档：`.claude/plans/local-vscode-integration.md`

## 目标

解除 Branch/Frame 对 Sandbox 的强绑定，为本地 VSCode 集成提供数据模型基础。

## 修改文件清单（精确到行）

### 1. 新增 `packages/models/src/project/environment.ts`
- 新增 `ProjectEnvironment` 枚举：`SANDBOX` / `LOCAL_VSCODE`

### 2. 修改 `packages/models/src/project/branch.ts`
- `sandbox` 改为可选：`{ id: string } | null`
- 新增字段：`environment: ProjectEnvironment`
- 新增字段：`localPath: string | null`
- 新增字段：`devServerPort: number | null`

### 3. 修改 `packages/models/src/project/index.ts`
- 导出 `./environment`

### 4. 修改 `packages/db/src/schema/project/branch.ts`
- `sandboxId` 改为可选（移除 `.notNull()`）
- 新增 `environment` 列，默认 `'sandbox'`
- 新增 `localPath` 列，可选
- 新增 `devServerPort` 列，可选

### 5. 修改 `packages/db/src/mappers/project/branch.ts`
- `fromDbBranch`：sandbox 条件化，新增 environment/localPath/devServerPort 映射
- `toDbBranch`：sandbox 条件化，新增字段映射

### 6. 修改 `packages/db/src/defaults/branch.ts`
- `createDefaultBranch`：`sandboxId` 改为可选
- 新增 `environment`/`localPath`/`devServerPort` 字段

### 7. 修改 `apps/web/client/src/server/api/routers/project/project.ts`
- `create` mutation：`sandboxId`/`sandboxUrl` 改为可选
- 新增 `environment` 输入参数，默认 `'sandbox'`
- 本地环境时 `sandboxId` 可为空

### 8. 修改 `apps/web/client/src/components/store/editor/sandbox/index.ts`
- `init()` 方法：根据 `branch.environment` 选择 Provider
- 本地环境时使用 LocalProvider（暂用占位符，Phase 3 实现真正连接）

### 9. 修改 `apps/web/client/src/components/store/editor/sandbox/session.ts`
- `start()` 方法：支持本地模式跳过 CodeSandbox 连接

### 10. 修改 `apps/web/client/src/components/store/create/manager.ts`
- 新增本地创建流程（占位符，Phase 4 完善 UI）

### 11. 修改 `apps/web/client/src/server/api/routers/project/branch.ts`
- `fork`/`createBlank`：兼容 `sandboxId` 可选
- `fromDbBranch` 适配

### 12. 修改 `apps/web/client/src/server/api/routers/project/fork.ts`
- `forkAllBranches`：兼容 `sandboxId` 可选

### 13. 修改 `packages/code-provider/src/providers.ts`
- 新增 `CodeProvider.Local = 'local'`

### 14. 修改 `packages/code-provider/src/index.ts`
- 新增 LocalProvider 导出和工厂分支（占位符）

## 不修改的文件
- Frame 表不需要改动（`url` 字段已经是 string，存 sandbox URL 或 localhost URL 均可）
- Canvas 表不需要改动
- Project 表不需要改动（`sandboxId`/`sandboxUrl` 已标记为 deprecated）

## 兼容性策略
- `sandboxId` 改为可选，但现有数据已有值，不影响
- `environment` 默认值为 `'sandbox'`，现有数据自动归为 sandbox 环境
- 所有现有 API 调用继续正常工作

## 阶段完成输出
- 修改文档
- 端到端测试文档

## 依赖
无前置依赖，可直接开始。
