# Phase 5 Changelog: 入口合并（VSCode/Cursor → 统一内置浏览器）

> 日期：2026-04-20
> 实施内容：将入口 2 和入口 3 合并为单一入口

---

## 一、实现概述

将原来的两个入口合并为统一的 `onlook.openProject` 命令，根据 IDE 能力自动选择最佳浏览器：

1. **Integrated Browser**（VSCode 1.109+）：完整 Chromium 浏览器，支持登录、DevTools、数据持久化
2. **Simple Browser iframe**：旧版 VSCode 降级使用
3. **外部浏览器**：无内置浏览器时的最终降级

---

## 二、改动文件

### 新增文件

| 文件 | 说明 |
|------|------|
| `apps/vscode-extension/src/browser/browser-detector.ts` | 浏览器能力检测模块（含缓存机制） |

### 修改文件

| 文件 | 改动 |
|------|------|
| `apps/vscode-extension/src/browser/ide-launcher.ts` | 重构 `openOnlook()` 和 `openUrl()`，实现多级降级链 |
| `apps/vscode-extension/package.json` | 新增 `onlook.useIntegratedBrowser` 配置项 |
| `apps/vscode-extension/src/extension.ts` | 移除 `onlook.openInBrowser` 命令，简化配置变更监听 |
| `.claude/plans/local-vscode-integration.md` | 更新入口设计章节 |
| `.claude/phases/current-state.md` | 更新 Phase 完成状态 |

---

## 三、关键代码

### browser-detector.ts

```typescript
export interface BrowserCapabilities {
    hasIntegratedBrowser: boolean;  // VSCode 1.109+
    hasSimpleBrowser: boolean;       // Simple Browser iframe
    detectedAt: number;
}

export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
    // 使用缓存（5分钟有效）
    const commands = await vscode.commands.getCommands(true);
    return {
        hasIntegratedBrowser: commands.includes('workbench.action.browser.open'),
        hasSimpleBrowser: commands.includes('simpleBrowser.api.open'),
        detectedAt: Date.now(),
    };
}
```

### ide-launcher.ts 降级链

```typescript
private async tryOpenInOrder(url: string, capabilities: BrowserCapabilities): Promise<BrowserType> {
    // 1. Integrated Browser（VSCode 1.109+）
    if (capabilities.hasIntegratedBrowser) {
        try {
            await vscode.commands.executeCommand('workbench.action.browser.open', url);
            return BrowserType.INTEGRATED;
        } catch (error) { /* 降级 */ }
    }

    // 2. Simple Browser API
    if (capabilities.hasSimpleBrowser) {
        try {
            await vscode.commands.executeCommand('simpleBrowser.api.open', vscode.Uri.parse(url));
            return BrowserType.SIMPLE;
        } catch (error) { /* 降级 */ }
    }

    // 3. 外部浏览器
    await vscode.env.openExternal(vscode.Uri.parse(url));
    return BrowserType.EXTERNAL;
}
```

---

## 四、配置项

```json
{
  "onlook.useIntegratedBrowser": {
    "type": "boolean",
    "default": true,
    "description": "优先在 IDE 内置浏览器中打开 Onlook。关闭则使用外部浏览器。"
  }
}
```

---

## 五、测试矩阵

| IDE 版本 | useIntegratedBrowser | 预期行为 |
|---------|---------------------|---------|
| VSCode 1.109+ | true | Integrated Browser |
| VSCode 1.109+ | false | 外部浏览器 |
| VSCode < 1.109 | true | Simple Browser iframe → 外部浏览器 |
| VSCode < 1.109 | false | 外部浏览器 |
| Cursor（任意版本） | true | Integrated/Simple（取决于 Cursor 版本） |
| Cursor（任意版本） | false | 外部浏览器 |

---

## 六、代码审查发现（待后续修复）

| 问题 | 严重程度 | 备注 |
|------|---------|------|
| Token 通过 URL query 参数传递 | HIGH | 原有问题，不在本次修改范围 |
| unsafe `as` casts 无运行时验证 | HIGH | 原有问题 |
| `enum BrowserType` 应改为 string literal union | MEDIUM | 可后续优化 |

---

## 七、下一步

- Phase 6：端到端测试（三个入口完整流程）
- 修复 Token 传递方式（从 URL 参数改为 WebSocket Header）