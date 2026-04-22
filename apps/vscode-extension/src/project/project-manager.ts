/**
 * 项目管理器 - 创建和管理本地项目
 *
 * 项目创建流程：
 * 1. 使用 npx create-next-app 生成项目脚手架
 * 2. 将项目路径注册到 Onlook 数据库（通过 tRPC API）
 * 3. 注入 Onlook preload script 到 root layout
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { ProjectCreateParams, ProjectCreateFromGitParams } from '../server/protocol';
import { PreloadScriptInjector } from './preload-inject';

/** 项目创建结果 */
interface ProjectCreateResult {
    projectPath: string;
    name: string;
    success: boolean;
}

export class ProjectManager {
    private preloadInjector: PreloadScriptInjector;

    constructor(private context: vscode.ExtensionContext) {
        this.preloadInjector = new PreloadScriptInjector();
    }

    /**
     * 创建新的本地项目
     * 使用 npx create-next-app 生成脚手架
     */
    async createProject(name: string, parentPath: string): Promise<ProjectCreateResult> {
        const projectPath = path.join(parentPath, name);

        // 检查目标路径是否已存在
        if (fs.existsSync(projectPath)) {
            throw new Error(`项目路径已存在: ${projectPath}`);
        }

        // 使用 create-next-app 创建项目
        // --yes 跳过确认，--ts 使用 TypeScript，--tailwind 使用 TailwindCSS，
        // --app 使用 App Router，--eslint 启用 ESLint，--src-dir 使用 src 目录
        const command = `npx create-next-app@latest "${name}" --yes --ts --tailwind --app --eslint --src-dir --import-alias "@/*"`;

        return new Promise((resolve, reject) => {
            exec(command, { cwd: parentPath, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`创建项目失败: ${error.message}\n${stderr}`));
                    return;
                }

                // 验证项目已创建
                if (!fs.existsSync(projectPath)) {
                    reject(new Error(`项目创建后路径不存在: ${projectPath}`));
                    return;
                }

                // 在 VSCode 中打开项目
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), false);

                // 异步注入 preload script（不阻塞项目创建响应）
                this.injectPreloadScriptAsync(projectPath);

                resolve({
                    projectPath,
                    name,
                    success: true,
                });
            });
        });
    }

    /**
     * 从 WebSocket 请求参数创建项目
     */
    async createProjectFromParams(params: unknown): Promise<ProjectCreateResult> {
        const { name, parentPath } = params as ProjectCreateParams;
        return this.createProject(name, parentPath);
    }

    /**
     * 从 Git 仓库创建项目
     */
    async createProjectFromGit(params: unknown): Promise<ProjectCreateResult> {
        const { repoUrl, branch, parentPath } = params as ProjectCreateFromGitParams;

        // 从仓库 URL 提取项目名称
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') ?? 'my-app';
        const projectPath = path.join(parentPath, repoName);

        if (fs.existsSync(projectPath)) {
            throw new Error(`项目路径已存在: ${projectPath}`);
        }

        const command = `git clone --branch ${branch} --depth 1 ${repoUrl} "${projectPath}"`;

        return new Promise((resolve, reject) => {
            exec(command, { cwd: parentPath, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Git 克隆失败: ${error.message}\n${stderr}`));
                    return;
                }

                // 安装依赖
                exec('npm install', { cwd: projectPath, maxBuffer: 1024 * 1024 * 10 }, (installError) => {
                    if (installError) {
                        console.warn(`[Onlook] 依赖安装失败: ${installError.message}`);
                        // 不阻止项目创建
                    }

                    resolve({
                        projectPath,
                        name: repoName,
                        success: true,
                    });
                });
            });
        });
    }

    /**
     * 异步注入 preload script（不阻塞项目创建响应）
     */
    private async injectPreloadScriptAsync(projectPath: string): Promise<void> {
        try {
            // 从扩展资源目录读取 preload script
            const preloadContent = this.getPreloadScriptContent();
            if (preloadContent) {
                await this.preloadInjector.inject(projectPath, preloadContent);
            } else {
                console.warn('[Onlook ProjectManager] 无法获取 preload script 内容');
            }
        } catch (error) {
            console.error('[Onlook ProjectManager] 注入 preload script 失败:', error);
        }
    }

    /**
     * 获取 preload script 内容
     * 优先从 Web 客户端的 public 目录读取，或从扩展资源中读取
     */
    private getPreloadScriptContent(): string | null {
        // 尝试从本地 Onlook Web 客户端的 public 目录读取
        // 扩展可能安装在 monorepo 旁边
        const possiblePaths = [
            // monorepo 中 Web 客户端的 public 目录
            path.resolve(__dirname, '../../../../web/client/public', PRELOAD_SCRIPT_FILE),
            // 打包后的扩展资源
            path.resolve(__dirname, '../resources', PRELOAD_SCRIPT_FILE),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, 'utf-8');
            }
        }

        console.warn('[Onlook ProjectManager] 未找到 preload script 文件');
        return null;
    }
}

const PRELOAD_SCRIPT_FILE = 'onlook-preload-script.js';
