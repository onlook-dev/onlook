/**
 * IDE 启动器 - 在 VSCode/Cursor 中打开文件或在浏览器中打开 Onlook
 *
 * 支持三种浏览器模式（降级链）：
 * 1. Integrated Browser（VSCode 1.109+，完整 Chromium 浏览器）
 * 2. Simple Browser API（iframe webview）
 * 3. 外部浏览器（系统默认）
 */

import * as vscode from 'vscode';
import type { SecurityManager } from '../server/security';
import type { IdeOpenFileParams, IdeOpenFolderParams } from '../server/protocol';

export enum BrowserType {
    INTEGRATED = 'integrated',
    SIMPLE = 'simple',
    EXTERNAL = 'external',
}

export class IdeLauncher {
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * 在 IDE 中打开指定文件
     */
    async openFile(params: unknown): Promise<{ success: boolean }> {
        const { filePath, line, column } = params as IdeOpenFileParams;

        try {
            const uri = vscode.Uri.file(filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc);

            // 跳转到指定行
            if (line) {
                const position = new vscode.Position(line - 1, (column ?? 1) - 1);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }

            return { success: true };
        } catch (error) {
            throw new Error(`打开文件失败 ${filePath}: ${error}`);
        }
    }

    /**
     * 在 IDE 中打开文件夹
     */
    async openFolder(params: unknown): Promise<{ success: boolean }> {
        const { folderPath } = params as IdeOpenFolderParams;

        try {
            const uri = vscode.Uri.file(folderPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, false);
            return { success: true };
        } catch (error) {
            throw new Error(`打开文件夹失败 ${folderPath}: ${error}`);
        }
    }

    /**
     * 在浏览器中打开 Onlook Web
     *
     * 合并后的入口：根据用户配置选择最佳浏览器
     * 降级链：Integrated Browser → Simple Browser → 外部浏览器
     */
    async openOnlook(port: number, security: SecurityManager): Promise<void> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const token = security.registerToken(undefined, undefined);
        const onlookUrl = this.buildOnlookUrl(port, token, workspacePath);

        // 读取用户配置
        const useIntegrated = vscode.workspace
            .getConfiguration('onlook')
            .get<boolean>('useIntegratedBrowser', true);

        if (!useIntegrated) {
            // 用户明确选择外部浏览器
            await this.openExternal(onlookUrl);
            vscode.window.showInformationMessage('[Onlook] 已在浏览器中打开 Onlook');
            return;
        }

        // 直接尝试降级链（不先检测命令是否存在）
        const browserType = await this.tryOpenInOrder(onlookUrl);

        // 根据结果提示用户
        this.showOpenResult(browserType);
    }

    /**
     * 按优先级顺序尝试打开浏览器
     * Integrated → Simple → External
     *
     * 注意：直接执行命令，不先检测是否存在（某些命令可执行但不出现在 getCommands 列表中）
     */
    private async tryOpenInOrder(url: string): Promise<BrowserType> {
        // 1. 尝试 Integrated Browser（VSCode 1.109+）
        // 直接执行，不先检测
        try {
            console.log('[Onlook] 尝试打开 Integrated Browser (workbench.action.browser.open)...');
            await vscode.commands.executeCommand('workbench.action.browser.open', url);
            console.log('[Onlook] Integrated Browser 打开成功');
            return BrowserType.INTEGRATED;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('[Onlook] Integrated Browser 不可用:', errorMsg);
        }

        // 2. 尝试 Simple Browser API
        // 直接执行，不先检测（Cursor 的内置浏览器命令可能不在 getCommands 列表中）
        try {
            console.log('[Onlook] 尝试打开 Simple Browser (simpleBrowser.api.open)...');
            await vscode.commands.executeCommand('simpleBrowser.api.open', vscode.Uri.parse(url));
            console.log('[Onlook] Simple Browser 打开成功');
            return BrowserType.SIMPLE;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('[Onlook] Simple Browser 不可用:', errorMsg);
        }

        // 3. 最终降级：外部浏览器
        console.log('[Onlook] 降级到外部浏览器');
        await this.openExternal(url);
        return BrowserType.EXTERNAL;
    }

    /**
     * 打开外部浏览器
     */
    private async openExternal(url: string): Promise<void> {
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }

    /**
     * 根据打开结果显示提示信息
     */
    private showOpenResult(browserType: BrowserType): void {
        const messages: Record<BrowserType, string> = {
            [BrowserType.INTEGRATED]: '[Onlook] 已在 IDE 内置浏览器中打开',
            [BrowserType.SIMPLE]: '[Onlook] 已在 Simple Browser 中打开（功能受限）',
            [BrowserType.EXTERNAL]: '[Onlook] IDE 不支持内置浏览器，已在外部浏览器中打开',
        };

        vscode.window.showInformationMessage(messages[browserType]);
    }

    /**
     * 打开指定 URL（入口 1 项目创建后跳转）
     * 使用相同的降级逻辑
     */
    async openUrl(url: string): Promise<void> {
        const useIntegrated = vscode.workspace
            .getConfiguration('onlook')
            .get<boolean>('useIntegratedBrowser', true);

        if (!useIntegrated) {
            await this.openExternal(url);
            return;
        }

        const browserType = await this.tryOpenInOrder(url);
        this.showOpenResult(browserType);
    }

    /**
     * 构建 Onlook Web URL，附带本地 Agent 连接参数
     */
    private buildOnlookUrl(port: number, token: string, workspacePath?: string): string {
        // 从配置获取 Onlook Web URL（默认使用当前打开的 URL 或 localhost）
        const onlookUrl = vscode.workspace
            .getConfiguration('onlook')
            .get<string>('webUrl', 'http://localhost:3000');

        const url = new URL(onlookUrl);
        url.searchParams.set('localAgent', String(port));
        url.searchParams.set('token', token);

        if (workspacePath) {
            url.searchParams.set('workspacePath', workspacePath);
        }

        // 标记 IDE 类型（用于 Web 端适配）
        const isCursor = vscode.env.appName.includes('Cursor');
        url.searchParams.set('ide', isCursor ? 'cursor' : 'vscode');

        return url.toString();
    }
}
