# Phase 4 修改文档：Web UI 改造

> 完成日期：2026-04-15
> 前置 Phase：Phase 0（数据模型）、Phase 1（扩展基础）、Phase 2+3（扩展完整 + LocalProvider）

## 一、修改概览

Phase 4 的核心目标是完成 Web 端 UI 改造，使本地 VSCode 集成功能对用户可见和可用。

### 实现内容
1. **本地扩展健康检查**：检测 localhost:9527/health 端点
2. **项目创建环境选择**：TopBar 下拉菜单新增"本地 VSCode"选项
3. **Projects API 扩展**：项目列表响应返回默认分支的 environment
4. **项目卡片环境标识**：显示 Cloud/Local 环境标签
5. **Frame URL 动态适配**：本地项目使用 localhost URL

---

## 二、修改文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `apps/web/client/src/utils/local-agent.ts` | 本地扩展健康检测工具函数 |

### 修改文件

| 文件 | 改动说明 |
|------|----------|
| `packages/models/src/project/project.ts` | Project 接口新增 `environment?` 字段 |
| `apps/web/client/src/server/api/routers/project/project.ts` | `list` 查询关联 branches 表，返回 environment；导入 ProjectEnvironment |
| `apps/web/client/src/app/projects/_components/top-bar.tsx` | Create 下拉菜单新增"Local VSCode"分类和"Blank Local Project"选项；导入检测函数和新增组件 |
| `apps/web/client/src/app/projects/_components/select/project-card.tsx` | 项目卡片左上角新增 Cloud/Local 环境标识 |
| `apps/web/client/src/app/project/[id]/_components/canvas/frame/view.tsx` | 新增 `resolveFrameUrl()` 函数，iframe src 使用动态计算的 URL |

---

## 三、新增工具函数

### 3.1 detectLocalAgent()

```typescript
// apps/web/client/src/utils/local-agent.ts
interface LocalAgentStatus {
    available: boolean;  // 扩展是否在线
    port?: number;       // WebSocket 端口
    version?: string;    // 扩展版本
    clients?: number;    // 已连接客户端数
}

async function detectLocalAgent(port?: number): Promise<LocalAgentStatus>
async function scanLocalAgent(): Promise<LocalAgentStatus>  // 扫描 9527-9529
```

检测逻辑：`fetch('http://localhost:9527/health')`，2 秒超时。

---

## 四、项目创建流程变更

### 4.1 TopBar 下拉菜单

```
┌──────────────────────────┐
│  Sandbox (Cloud)         │
│  ├ Blank Project         │  ← 现有功能
│  ─────────────────────   │
│  Local VSCode  🟢/⚫     │  ← 新增分类，带在线状态
│  ├ Blank Local Project   │  ← 新增选项
│  ─────────────────────   │
│  Import                  │  ← 现有功能
└──────────────────────────┘
```

- 下拉菜单打开时自动检测本地扩展在线状态
- 绿色圆点 = 扩展在线，灰色圆点 = 扩展离线
- 选择"Blank Local Project"后：
  1. 创建项目（environment='local_vscode'，无 sandboxId）
  2. 构造 `vscode://onlook.createProject?...` URI
  3. 通过 `window.location.href` 打开 URI
  4. 导航到项目页面，等待扩展连接

---

## 五、Projects API 扩展

### 5.1 list 查询变更

```typescript
// 变更前
with: { project: true }

// 变更后
with: {
    project: {
        with: {
            branches: {
                where: eq(branches.isDefault, true),
                limit: 1,
            },
        },
    },
}
```

返回结果中额外附加：
```typescript
project.environment = defaultBranch.environment;
```

### 5.2 Project 模型变更

```typescript
interface Project {
    id: string;
    name: string;
    metadata: { ... };
    environment?: ProjectEnvironment;  // 新增：默认分支的运行环境
}
```

---

## 六、项目卡片环境标识

```
┌───────────────────────────┐
│ [☁ Cloud]       [设置 ⚙]  │  ← 左上角环境标签
│                           │
│    （项目预览图）           │
│                           │
│    项目名称                │
│    3 小时前                │
└───────────────────────────┘

┌───────────────────────────┐
│ [💻 Local]      [设置 ⚙]  │  ← 紫色 Local 标签
│                           │
│    （项目预览图）           │
│                           │
│    项目名称                │
│    3 小时前                │
└───────────────────────────┘
```

- Cloud：蓝色标签，Globe 图标
- Local：紫色标签，Laptop 图标

---

## 七、Frame URL 动态适配

### 7.1 resolveFrameUrl() 函数

```typescript
function resolveFrameUrl(frame, branchData): string {
    if (environment === ProjectEnvironment.LOCAL_VSCODE) {
        const port = branchData?.branch.devServerPort ?? 3000;
        // 保留 URL 路径部分
        return `http://localhost:${port}${urlObj.pathname}`;
    }
    return frame.url;  // Sandbox 环境使用原始 URL
}
```

### 7.2 FrameComponent 变更

```typescript
// 变更前
src={frame.url}

// 变更后
const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
const resolvedUrl = useMemo(() => resolveFrameUrl(frame, branchData), [...]);
src={resolvedUrl}
```

当 devServerPort 变化时（如扩展启动 dev server 后通过 WebSocket 推送），URL 自动更新。

---

## 八、兼容性影响

| 功能 | 影响 | 说明 |
|------|------|------|
| 创建 Sandbox 项目 | 无影响 | 原有路径不变 |
| 打开 Sandbox 项目 | 无影响 | Frame URL 使用原始 frame.url |
| 创建本地项目 | 新功能 | 新增菜单项和创建流程 |
| 项目卡片 | 兼容 | 无 environment 时默认显示 Cloud |
| Frame 渲染 | 兼容 | branchData 为 null 时 fallback 到 frame.url |
| API 响应 | 向后兼容 | environment 为可选字段，旧客户端忽略 |

---

## 九、已知限制

| 限制 | 说明 | 后续计划 |
|------|------|----------|
| 本地创建流程未完整 | 创建项目后打开 URI，但扩展的 URI handler 尚未实现完整的项目初始化流程 | Phase 5 完善 |
| 项目卡片无在线状态 | Local 项目只显示环境类型，不显示扩展是否在线 | 可后续添加心跳检测 |
| Frame URL 更新时机 | devServerPort 更新依赖 branch 数据刷新 | 可通过 WebSocket 事件触发 |
| 模板创建 | Template Modal 暂不支持选择本地环境 | 后续迭代添加 |
