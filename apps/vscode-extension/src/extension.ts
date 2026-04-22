/**
 * Onlook VSCode/Cursor 扩展入口
 *
 * 核心功能：
 * 1. 启动 WebSocket 服务器，作为 Web 客户端和本地文件系统的桥接层
 * 2. 处理 vscode://onlook.onlook-local URI，支持从 Web 端打开项目
 * 3. 提供文件操作代理、文件监听、Dev Server 管理
 * 4. 状态栏指示器，显示连接状态
 */

import * as vscode from 'vscode';
import { AgentServer } from './server/agent-server';

/** 扩展全局状态 */
let agentServer: AgentServer | null = null;

/** 状态栏项 */
let statusBarItem: vscode.StatusBarItem | null = null;

/**
 * 更新状态栏显示
 */
function updateStatusBar(): void {
    if (!statusBarItem) { return; }

    const status = agentServer?.getStatus();
    if (status?.running) {
        statusBarItem.text = `$(radio-tower) Onlook :${status.port}`;
        statusBarItem.tooltip = `Onlook 运行中 — 端口 ${status.port}，客户端 ${status.clients ?? 0} 个`;
        statusBarItem.command = 'onlook.showStatus';
        statusBarItem.show();
    } else {
        statusBarItem.text = '$(circle-slash) Onlook';
        statusBarItem.tooltip = 'Onlook 未运行';
        statusBarItem.command = 'onlook.showStatus';
        statusBarItem.show();
    }
}

/**
 * 扩展激活入口
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('[Onlook] 扩展激活');

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(loading~spin) Onlook';
    statusBarItem.show();

    // 创建并启动 Agent 服务器
    agentServer = new AgentServer(context);
    try {
        await agentServer.start();
    } catch (error) {
        console.error('[Onlook] Agent 服务器启动失败:', error);
        vscode.window.showErrorMessage(`[Onlook] Agent 服务器启动失败: ${error}`);
    }

    // 更新状态栏
    updateStatusBar();

    // 注册命令：创建本地项目
    const createProjectCmd = vscode.commands.registerCommand(
        'onlook.createProject',
        async () => {
            const projectName = await vscode.window.showInputBox({
                prompt: '输入项目名称',
                placeHolder: 'my-nextjs-app',
                value: 'my-nextjs-app',
            });
            if (!projectName) { return; }

            const folder = await vscode.window.showOpenDialog({
                title: '选择项目创建目录',
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
            });
            if (!folder || folder.length === 0) { return; }

            try {
                await agentServer?.projectManager.createProject(projectName, folder[0].fsPath);
                vscode.window.showInformationMessage(`[Onlook] 项目 "${projectName}" 创建成功`);
            } catch (error) {
                vscode.window.showErrorMessage(`[Onlook] 创建项目失败: ${error}`);
            }
        }
    );

    // 注册命令：在 IDE 浏览器中打开 Onlook（合并入口）
    const openProjectCmd = vscode.commands.registerCommand(
        'onlook.openProject',
        async () => {
            if (!vscode.workspace.workspaceFolders?.length) {
                vscode.window.showWarningMessage('[Onlook] 请先打开一个项目文件夹');
                return;
            }
            await agentServer?.openInBrowser();
        }
    );

    // 注册命令：显示连接状态
    const showStatusCmd = vscode.commands.registerCommand(
        'onlook.showStatus',
        () => {
            const status = agentServer?.getStatus() ?? { running: false };
            const msg = status.running
                ? `[Onlook] WebSocket 服务器运行中，端口: ${agentServer?.port}，客户端 ${status.clients ?? 0} 个`
                : '[Onlook] WebSocket 服务器未运行';
            vscode.window.showInformationMessage(msg);
            updateStatusBar();
        }
    );

    // 注册 URI Handler（支持 vscode://onlook.onlook-local）
    const uriHandler = vscode.window.registerUriHandler({
        handleUri: async (uri: vscode.Uri) => {
            await agentServer?.handleUri(uri);
        },
    });

    // 监听配置变更（需要重启的配置）
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
        (event) => {
            if (event.affectsConfiguration('onlook.agentPort') ||
                event.affectsConfiguration('onlook.allowedOrigins')) {
                vscode.window.showInformationMessage(
                    '[Onlook] 配置已更改，重新加载窗口以生效',
                    '重新加载'
                ).then((choice) => {
                    if (choice === '重新加载') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            }
        }
    );

    context.subscriptions.push(
        createProjectCmd,
        openProjectCmd,
        showStatusCmd,
        uriHandler,
        configChangeListener,
        statusBarItem,
    );
}

/**
 * 扩展停用入口
 * 确保所有资源被正确清理：
 * - 关闭 WebSocket 服务器及所有客户端连接
 * - 停止所有 Dev Server 进程
 * - 终止所有终端实例
 * - 停止文件监听
 * - 销毁状态栏
 */
export async function deactivate() {
    console.log('[Onlook] 扩展停用，开始清理资源...');

    // 清理 Agent 服务器（内含关闭 WS、停止 dev server、终止终端、停止监听）
    if (agentServer) {
        await agentServer.stop();
        agentServer = null;
    }

    // 销毁状态栏
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = null;
    }

    console.log('[Onlook] 扩展停用完成');
}
