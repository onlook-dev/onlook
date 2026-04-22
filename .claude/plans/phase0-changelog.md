# Phase 0 修改文档：数据模型改造

> 完成日期：2026-04-15
> 前置方案文档：`.claude/plans/local-vscode-integration.md`

## 一、修改概览

Phase 0 的核心目标是解除 Branch/Frame 对 Sandbox 的强绑定，为本地 VSCode 集成提供数据模型基础。

### 变更原则
- **向后兼容**：所有现有数据自动归为 `sandbox` 环境，零影响
- **渐进式**：新字段有默认值，无需立即填充
- **最小改动**：只改必要的文件，不引入新依赖

---

## 二、修改文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `packages/models/src/project/environment.ts` | `ProjectEnvironment` 枚举（SANDBOX / LOCAL_VSCODE） |
| `packages/code-provider/src/providers/local/types.ts` | `LocalProviderOptions` 接口定义 |
| `packages/code-provider/src/providers/local/index.ts` | `LocalProvider` 占位实现（含中文注释） |

### 修改文件

| 文件 | 改动说明 |
|------|----------|
| `packages/models/src/project/index.ts` | 新增 `./environment` 导出 |
| `packages/models/src/project/branch.ts` | `sandbox` 改为可选 `{id: string} \| null`；新增 `environment`/`localPath`/`devServerPort` |
| `packages/db/src/schema/project/branch.ts` | `sandboxId` 移除 `.notNull()`；新增 `environment`(默认'sandbox')/`localPath`/`devServerPort` 列 |
| `packages/db/src/mappers/project/branch.ts` | `fromDbBranch`/`toDbBranch` 适配新字段 |
| `packages/db/src/defaults/branch.ts` | `createDefaultBranch` 的 `sandboxId` 改为可选；自动推断环境类型 |
| `packages/db/src/seed/db.ts` | 补充 3 个 branch 对象的新字段 |
| `packages/code-provider/src/providers.ts` | 新增 `CodeProvider.Local = 'local'` |
| `packages/code-provider/src/index.ts` | 新增 `LocalProvider`/`LocalProviderOptions` 导出和工厂分支 |
| `apps/web/client/src/server/api/routers/project/project.ts` | `create` mutation 的 `sandboxId`/`sandboxUrl` 改为可选；新增 `environment` 参数；Frame URL 本地环境默认 `localhost:3000` |
| `apps/web/client/src/server/api/routers/project/branch.ts` | `fork` 增加 sandboxId 空值检查；`createBlank` 添加新字段 |
| `apps/web/client/src/server/api/routers/project/fork.ts` | `forkAllBranches` 跳过无 sandboxId 的分支 |
| `apps/web/client/src/components/store/editor/sandbox/index.ts` | 新增 `initLocal()`/`initSandbox()` 分支；`initializeSyncEngine` 适配本地环境 |
| `apps/web/client/src/components/store/editor/sandbox/session.ts` | `start()` 本地环境跳过 CodeSandbox 连接 |
| `apps/web/client/src/components/store/create/manager.ts` | 新增 `startCreateLocal()` 方法；现有方法传入 `environment` 参数 |
| `apps/web/client/src/app/project/[id]/_components/top-bar/project-breadcrumb.tsx` | `sandbox.id` → `sandbox?.id` |
| `apps/web/client/src/app/project/[id]/_components/top-bar/publish/dropdown/custom-domain/provider.tsx` | sandboxId 空值检查 |
| `apps/web/client/src/app/project/[id]/_components/top-bar/publish/dropdown/preview-domain-section.tsx` | sandboxId 空值检查 |
| `apps/web/client/src/app/projects/_components/templates/template-modal.tsx` | `sandbox.id` → `sandbox?.id` |

---

## 三、数据模型变更详情

### ProjectEnvironment 枚举

```typescript
enum ProjectEnvironment {
    SANDBOX = 'sandbox',        // 远程沙箱（CodeSandbox）
    LOCAL_VSCODE = 'local_vscode',  // 本地 VSCode/Cursor
}
```

### Branch 表变更

| 字段 | 变更前 | 变更后 |
|------|--------|--------|
| `sandboxId` | `varchar NOT NULL` | `varchar`（可为空） |
| `environment` | 不存在 | `varchar NOT NULL DEFAULT 'sandbox'` |
| `localPath` | 不存在 | `varchar`（可为空） |
| `devServerPort` | 不存在 | `integer`（可为空） |

### Branch 模型变更

```typescript
interface Branch {
    // ... 现有字段 ...
    sandbox: { id: string } | null;        // 改为可选
    environment: ProjectEnvironment;        // 新增
    localPath: string | null;              // 新增
    devServerPort: number | null;          // 新增
}
```

---

## 四、API 变更

### project.create

```typescript
// 变更前
input: {
    project: projectInsertSchema,
    userId: z.string(),
    sandboxId: z.string(),          // 必填
    sandboxUrl: z.string(),         // 必填
    creationData?: ...
}

// 变更后
input: {
    project: projectInsertSchema,
    userId: z.string(),
    sandboxId: z.string().optional(),    // 可选
    sandboxUrl: z.string().optional(),   // 可选
    environment: z.enum(['sandbox', 'local_vscode']).default('sandbox'),  // 新增
    creationData?: ...
}
```

---

## 五、数据库迁移说明

需要执行 `bun run db:push` 将 schema 变更推送到数据库。主要变更：

1. `branches.sandbox_id` 列移除 NOT NULL 约束
2. `branches.environment` 列新增，默认值 `'sandbox'`
3. `branches.local_path` 列新增，可为空
4. `branches.dev_server_port` 列新增，可为空

**迁移安全性**：所有新列有默认值或可为空，现有数据不受影响。

---

## 六、兼容性影响

### 对现有功能的影响

| 功能 | 影响 | 处理方式 |
|------|------|----------|
| 创建项目（Sandbox） | 无影响 | `environment` 默认 `'sandbox'`，`sandboxId` 仍可传 |
| 打开项目 | 无影响 | 现有项目都有 sandboxId |
| Fork 分支 | 兼容 | 无 sandboxId 的分支会跳过 |
| 截图 | 兼容 | 无 sandboxId 的项目会返回错误提示 |
| 发布/下载 | 兼容 | 无 sandboxId 的项目会提前返回 |
| Canvas iframe | 兼容 | Frame URL 存储方式不变 |

### 对下游 Phase 的影响

| Phase | 依赖的改动 |
|-------|-----------|
| Phase 1（VSCode 扩展） | `ProjectEnvironment` 枚举、`Branch.localPath`/`devServerPort` |
| Phase 2（Dev Server 管理） | `Branch.devServerPort` |
| Phase 3（LocalProvider） | `CodeProvider.Local`、`LocalProvider` 占位类 |
| Phase 4（Web UI） | `project.create` 的 `environment` 参数 |
