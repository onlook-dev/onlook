/**
 * Browser Detector - 检测 IDE 的浏览器打开能力
 *
 * 支持：
 * - VSCode 1.109+ Integrated Browser（完整 Chromium 浏览器）
 * - Simple Browser API（iframe webview）
 */

import * as vscode from 'vscode';

export interface BrowserCapabilities {
    /** 支持 VSCode 1.109+ Integrated Browser */
    hasIntegratedBrowser: boolean;
    /** 支持 Simple Browser API（iframe） */
    hasSimpleBrowser: boolean;
    /** 检测结果缓存时间戳 */
    detectedAt: number;
}

/** 浏览器能力检测结果缓存（5分钟有效） */
let cachedCapabilities: BrowserCapabilities | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * 检测 IDE 的浏览器打开能力
 */
export async function detectBrowserCapabilities(): Promise<BrowserCapabilities> {
    // 使用缓存（避免频繁调用 getCommands）
    if (cachedCapabilities && Date.now() - cachedCapabilities.detectedAt < CACHE_DURATION_MS) {
        console.log('[Onlook] 使用缓存的浏览器能力检测结果:', cachedCapabilities);
        return cachedCapabilities;
    }

    const commands = await vscode.commands.getCommands(true);

    // 检测两个关键命令
    const hasIntegratedBrowser = commands.includes('workbench.action.browser.open');
    const hasSimpleBrowser = commands.includes('simpleBrowser.api.open');

    // 输出完整检测结果供调试
    console.log('[Onlook] 浏览器能力检测:');
    console.log('  - IDE 名称:', vscode.env.appName);
    console.log('  - 总命令数:', commands.length);
    console.log('  - hasIntegratedBrowser (workbench.action.browser.open):', hasIntegratedBrowser);
    console.log('  - hasSimpleBrowser (simpleBrowser.api.open):', hasSimpleBrowser);

    // 检查是否有类似的浏览器命令
    const browserCommands = commands.filter(cmd =>
        cmd.includes('browser') || cmd.includes('simpleBrowser') || cmd.includes('open')
    );
    console.log('  - 浏览器相关命令:', browserCommands.join(', '));

    cachedCapabilities = {
        hasIntegratedBrowser,
        hasSimpleBrowser,
        detectedAt: Date.now(),
    };

    return cachedCapabilities;
}

/**
 * 清除缓存（用于测试或强制重新检测）
 */
export function clearBrowserCache(): void {
    cachedCapabilities = null;
}