/**
 * Preload Script 注入器
 *
 * 将 Onlook 的 preload script 注入到本地项目中：
 * 1. 将 onlook-preload-script.js 复制到项目的 public/ 目录
 * 2. 在项目的 root layout.tsx 中注入 <Script> 标签
 *
 * 与 Web 端的 preload-script.ts 功能相同，但直接操作本地文件系统
 */

import * as fs from 'fs';
import * as path from 'path';

/** Preload script 文件名 */
const PRELOAD_SCRIPT_FILE = 'onlook-preload-script.js';

/** 需要注入的 Script 标签 */
const PRELOAD_SCRIPT_TAG = `<Script src="/${PRELOAD_SCRIPT_FILE}" strategy="beforeInteractive" />`;

/** 已注入标记注释 */
const INJECTION_MARKER = '/* onlook-preload-script-injected */';

export class PreloadScriptInjector {
    /**
     * 注入 preload script 到本地项目
     *
     * @param projectPath 项目根目录
     * @param preloadScriptContent preload script 的内容
     */
    async inject(projectPath: string, preloadScriptContent: string): Promise<void> {
        // 1. 确保 public 目录存在
        const publicDir = path.join(projectPath, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // 2. 复制 preload script 到 public 目录
        const targetScriptPath = path.join(publicDir, PRELOAD_SCRIPT_FILE);
        fs.writeFileSync(targetScriptPath, preloadScriptContent, 'utf-8');
        console.info(`[Onlook Preload] 已复制 preload script 到 ${targetScriptPath}`);

        // 3. 查找并修改 root layout 文件
        await this.injectScriptIntoLayout(projectPath);
    }

    /**
     * 移除 preload script 注入
     */
    async remove(projectPath: string): Promise<void> {
        // 删除 public 目录下的 preload script
        const scriptPath = path.join(projectPath, 'public', PRELOAD_SCRIPT_FILE);
        if (fs.existsSync(scriptPath)) {
            fs.unlinkSync(scriptPath);
        }

        // 从 layout 文件中移除注入
        const layoutPath = this.findLayoutFile(projectPath);
        if (layoutPath && fs.existsSync(layoutPath)) {
            const content = fs.readFileSync(layoutPath, 'utf-8');
            const cleaned = this.removeInjection(content);
            if (cleaned !== content) {
                fs.writeFileSync(layoutPath, cleaned, 'utf-8');
            }
        }
    }

    /**
     * 查找 root layout 文件
     */
    private findLayoutFile(projectPath: string): string | null {
        // Next.js App Router layout 路径
        const layoutPaths = [
            path.join(projectPath, 'src', 'app', 'layout.tsx'),
            path.join(projectPath, 'src', 'app', 'layout.jsx'),
            path.join(projectPath, 'app', 'layout.tsx'),
            path.join(projectPath, 'app', 'layout.jsx'),
        ];

        // Next.js Pages Router _app 路径
        const pagesPaths = [
            path.join(projectPath, 'src', 'pages', '_app.tsx'),
            path.join(projectPath, 'src', 'pages', '_app.jsx'),
            path.join(projectPath, 'pages', '_app.tsx'),
            path.join(projectPath, 'pages', '_app.jsx'),
        ];

        for (const p of [...layoutPaths, ...pagesPaths]) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    /**
     * 在 layout 文件中注入 Script 标签
     */
    private async injectScriptIntoLayout(projectPath: string): Promise<void> {
        const layoutPath = this.findLayoutFile(projectPath);
        if (!layoutPath) {
            console.warn('[Onlook Preload] 未找到 layout 文件，跳过注入');
            return;
        }

        let content = fs.readFileSync(layoutPath, 'utf-8');

        // 检查是否已注入
        if (content.includes(INJECTION_MARKER)) {
            console.info('[Onlook Preload] layout 文件已包含注入，跳过');
            return;
        }

        // 确保 next/script 已导入
        const hasScriptImport = content.includes("from 'next/script'") || content.includes('from "next/script"');
        if (!hasScriptImport) {
            // 添加 next/script 导入
            const importInsertPoint = content.indexOf('\n', content.indexOf('import '));
            if (importInsertPoint !== -1) {
                content =
                    content.slice(0, importInsertPoint) +
                    `\nimport Script from 'next/script';` +
                    content.slice(importInsertPoint);
            }
        }

        // 在 <body> 标签后注入 Script 标签
        const bodyMatch = content.match(/<body[^>]*>/);
        if (bodyMatch && bodyMatch.index !== undefined) {
            const insertPosition = bodyMatch.index + bodyMatch[0].length;
            content =
                content.slice(0, insertPosition) +
                `\n        ${INJECTION_MARKER}\n        ${PRELOAD_SCRIPT_TAG}` +
                content.slice(insertPosition);
        } else {
            // 没有 <body> 标签，尝试在 return 语句后注入
            const returnMatch = content.match(/return\s*\(/);
            if (returnMatch && returnMatch.index !== undefined) {
                const insertPosition = content.indexOf('>', returnMatch.index);
                if (insertPosition !== -1) {
                    content =
                        content.slice(0, insertPosition + 1) +
                        `\n        ${INJECTION_MARKER}\n        ${PRELOAD_SCRIPT_TAG}` +
                        content.slice(insertPosition + 1);
                }
            }
        }

        fs.writeFileSync(layoutPath, content, 'utf-8');
        console.info(`[Onlook Preload] 已注入 Script 标签到 ${layoutPath}`);
    }

    /**
     * 从 layout 文件内容中移除注入
     */
    private removeInjection(content: string): string {
        // 移除 Script 标签
        let cleaned = content.replace(
            new RegExp(`\\s*${escapeRegExp(INJECTION_MARKER)}\\s*\\n?`, 'g'),
            ''
        );
        cleaned = cleaned.replace(
            new RegExp(`\\s*${escapeRegExp(PRELOAD_SCRIPT_TAG)}\\s*\\n?`, 'g'),
            ''
        );

        // 移除 next/script 导入（如果没有其他地方使用）
        if (!cleaned.includes('<Script') && !cleaned.includes('next/script')) {
            cleaned = cleaned.replace(/import Script from ['"]next\/script['"];\s*\n?/g, '');
        }

        return cleaned;
    }
}

/** 转义正则表达式特殊字符 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
