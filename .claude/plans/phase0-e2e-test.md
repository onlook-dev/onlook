# Phase 0 端到端测试文档

> 完成日期：2026-04-15

## 测试目标

验证数据模型改造后，现有功能不受影响，新增字段可正常使用。

---

## 测试前置条件

1. 执行 `bun run db:push` 推送数据库 schema 变更
2. 项目可正常启动（`bun run typecheck` 通过）

---

## 测试用例

### E2E-001：创建 Sandbox 项目（回归测试）

**目的：** 验证 Sandbox 环境的项目创建流程不受影响

**步骤：**
1. 打开 Onlook Web
2. 点击"创建新项目"
3. 输入提示词，创建项目
4. 验证项目创建成功

**预期结果：**
- 项目创建成功
- Branch 的 `environment` 为 `'sandbox'`
- Branch 的 `sandboxId` 有值
- Branch 的 `localPath` 为 null
- Branch 的 `devServerPort` 为 null
- Frame URL 指向 CodeSandbox 预览地址
- Canvas iframe 正常加载项目预览

**验证 SQL：**
```sql
SELECT id, name, environment, sandbox_id, local_path, dev_server_port
FROM branches
WHERE project_id = '<新建项目ID>';
-- 预期: environment='sandbox', sandbox_id 有值, local_path=NULL, dev_server_port=NULL
```

---

### E2E-002：打开已有 Sandbox 项目（回归测试）

**目的：** 验证现有 Sandbox 项目可正常打开和编辑

**步骤：**
1. 打开一个已有的 Sandbox 项目
2. 在 Canvas 中选择元素
3. 修改元素样式
4. 验证修改生效

**预期结果：**
- 项目正常加载
- Canvas iframe 显示项目预览
- 元素选择正常
- 样式修改正常
- 文件同步正常

---

### E2E-003：创建本地项目（新功能测试）

**目的：** 验证通过 API 创建本地环境项目

**步骤：**
1. 通过 tRPC API 调用 `project.create`，参数：
   ```typescript
   {
     project: createDefaultProject({ overrides: { name: 'Test Local' } }),
     userId: '<用户ID>',
     environment: 'local_vscode',
     // 不传 sandboxId 和 sandboxUrl
   }
   ```
2. 验证项目创建成功

**预期结果：**
- 项目创建成功
- Branch 的 `environment` 为 `'local_vscode'`
- Branch 的 `sandboxId` 为 null
- Branch 的 `localPath` 为 null（待扩展启动后更新）
- Branch 的 `devServerPort` 为 null（待扩展启动后更新）
- Frame URL 默认为 `http://localhost:3000`

**验证 SQL：**
```sql
SELECT id, name, environment, sandbox_id, local_path, dev_server_port
FROM branches
WHERE project_id = '<新建项目ID>';
-- 预期: environment='local_vscode', sandbox_id=NULL, local_path=NULL, dev_server_port=NULL
```

---

### E2E-004：Fork Sandbox 分支（回归测试）

**目的：** 验证 Fork 功能正常

**步骤：**
1. 打开一个 Sandbox 项目
2. Fork 默认分支
3. 验证新分支创建成功

**预期结果：**
- Fork 成功
- 新分支有 `sandboxId`
- 新分支的 `environment` 与源分支一致
- Canvas 中出现新 Frame

---

### E2E-005：本地项目不支持 Fork（边界测试）

**目的：** 验证本地项目的分支不支持 Sandbox fork

**步骤：**
1. 尝试对一个没有 `sandboxId` 的分支执行 fork

**预期结果：**
- 返回错误：`Cannot fork a local branch without sandbox ID`
- 不会创建新的 sandbox

---

### E2E-006：截图功能兼容（回归测试）

**目的：** 验证截图功能仅对 Sandbox 项目可用

**步骤：**
1. 对 Sandbox 项目执行截图
2. 对本地项目执行截图

**预期结果：**
- Sandbox 项目截图成功
- 本地项目返回错误：`No sandbox found for branch. Screenshots are only available for sandbox projects.`

---

### E2E-007：发布功能兼容（回归测试）

**目的：** 验证发布功能对 Sandbox 项目正常

**步骤：**
1. 打开 Sandbox 项目
2. 点击发布
3. 验证发布流程启动

**预期结果：**
- Sandbox 项目：sandboxId 正确传递，发布流程正常
- 本地项目：UI 提前返回，不执行发布

---

### E2E-008：GitHub 模板导入（回归测试）

**目的：** 验证从 GitHub 仓库导入项目正常

**步骤：**
1. 输入公开 GitHub 仓库 URL
2. 创建项目
3. 验证项目创建成功

**预期结果：**
- 项目创建成功
- `environment` 为 `'sandbox'`
- `sandboxId` 有值

---

### E2E-009：数据库默认值验证

**目的：** 验证新字段的默认值正确

**步骤：**
1. 直接通过 SQL 插入一条 branch 记录，不指定 environment/localPath/devServerPort
2. 查询该记录

**预期结果：**
```sql
INSERT INTO branches (id, project_id, name, is_default, sandbox_id)
VALUES (gen_random_uuid(), '<项目ID>', 'test', false, 'test-sandbox');

SELECT environment, local_path, dev_server_port FROM branches WHERE name = 'test';
-- 预期: environment='sandbox', local_path=NULL, dev_server_port=NULL
```

---

## 测试结果记录

| 用例 | 状态 | 备注 |
|------|------|------|
| E2E-001 | 待测 | 需要 db:push 后验证 |
| E2E-002 | 待测 | |
| E2E-003 | 待测 | |
| E2E-004 | 待测 | |
| E2E-005 | 待测 | |
| E2E-006 | 待测 | |
| E2E-007 | 待测 | |
| E2E-008 | 待测 | |
| E2E-009 | 待测 | |

---

## 注意事项

1. **数据库迁移**：测试前必须执行 `bun run db:push`
2. **Phase 0 仅改数据模型**：本地项目的完整创建流程（包括 VSCode 扩展交互）需等待后续 Phase 实现
3. **LocalProvider 为占位实现**：当前 LocalProvider 的所有方法返回空值/默认值，真正功能在 Phase 3 实现
4. **E2E-003 的替代验证**：由于 Web UI 还没有环境选择界面，可通过直接调用 API 或数据库查询验证
