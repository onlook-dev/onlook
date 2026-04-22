/**
 * 文件操作代理
 *
 * 通过 vscode.workspace.fs API 实现文件操作，
 * 支持远程文件系统（如 SSH Remote）。
 * 所有操作通过 WebSocket 转发给 Web 客户端。
 *
 * 重要：路径解析
 * Web 客户端发送的路径是相对于项目根目录的相对路径（如 src/app/page.tsx），
 * 需要通过 path.resolve(projectPath, relativePath) 解析为绝对路径后，
 * 才能传给 vscode.workspace.fs 使用。
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
    FileReadParams,
    FileWriteParams,
    FileDeleteParams,
    FileListParams,
    FileRenameParams,
    FileStatParams,
    FileMkdirParams,
} from '../server/protocol';

export class FileOpsManager {
    /** 项目根目录的绝对路径 */
    private _projectPath: string = '';

    /** 设置项目根路径（握手时由 AgentServer 调用） */
    set projectPath(p: string) {
        this._projectPath = p;
    }

    get projectPath(): string {
        return this._projectPath;
    }

    /**
     * 将相对路径解析为绝对路径
     * - 相对路径：基于 projectPath 解析
     * - 绝对路径：直接返回
     * - './' 和 '.'：解析为 projectPath 本身
     */
    private resolvePath(inputPath: string): string {
        if (!this._projectPath) {
            // 未设置 projectPath，直接返回（兼容旧行为）
            return inputPath;
        }

        // 处理 ./ 和 . 开头的路径
        const normalized = inputPath === './' || inputPath === '.'
            ? this._projectPath
            : path.resolve(this._projectPath, inputPath);

        return normalized;
    }

    /**
     * 读取文件内容
     */
    async readFile(params: unknown): Promise<{ content: string; type: 'text' | 'binary'; path: string }> {
        const { path: filePath, encoding } = params as FileReadParams;
        const resolvedPath = this.resolvePath(filePath);
        const uri = vscode.Uri.file(resolvedPath);

        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const textEncoding = encoding === 'binary' ? 'utf-8' : (encoding ?? 'utf-8');
            const text = new TextDecoder(textEncoding).decode(content);
            return { content: text, type: encoding === 'binary' ? 'binary' : 'text', path: filePath };
        } catch (error) {
            throw new Error(`读取文件失败 ${resolvedPath}: ${error}`);
        }
    }

    /**
     * 写入文件
     */
    async writeFile(params: unknown): Promise<{ success: boolean }> {
        const { path: filePath, content, overwrite } = params as FileWriteParams;
        const resolvedPath = this.resolvePath(filePath);
        const uri = vscode.Uri.file(resolvedPath);

        try {
            // 检查文件是否存在
            if (!overwrite) {
                try {
                    await vscode.workspace.fs.stat(uri);
                    // 文件已存在且不覆盖，跳过
                    return { success: true };
                } catch {
                    // 文件不存在，可以创建
                }
            }

            const encoded = new TextEncoder().encode(content);
            await vscode.workspace.fs.writeFile(uri, encoded);
            return { success: true };
        } catch (error) {
            throw new Error(`写入文件失败 ${resolvedPath}: ${error}`);
        }
    }

    /**
     * 删除文件或目录
     */
    async deleteFile(params: unknown): Promise<{ success: boolean }> {
        const { path: filePath, recursive } = params as FileDeleteParams;
        const resolvedPath = this.resolvePath(filePath);
        const uri = vscode.Uri.file(resolvedPath);

        try {
            await vscode.workspace.fs.delete(uri, { recursive: recursive ?? false });
            return { success: true };
        } catch (error) {
            throw new Error(`删除失败 ${resolvedPath}: ${error}`);
        }
    }

    /**
     * 列出目录中的文件
     */
    async listFiles(params: unknown): Promise<{
        files: Array<{ name: string; type: 'file' | 'directory'; isSymlink: boolean }>;
    }> {
        const { path: dirPath } = params as FileListParams;
        const resolvedPath = this.resolvePath(dirPath);
        const uri = vscode.Uri.file(resolvedPath);

        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);
            const files = entries.map(([name, type]) => ({
                name,
                type: type === vscode.FileType.Directory ? 'directory' as const : 'file' as const,
                isSymlink: type === vscode.FileType.SymbolicLink,
            }));
            return { files };
        } catch (error) {
            throw new Error(`列出目录失败 ${resolvedPath}: ${error}`);
        }
    }

    /**
     * 重命名/移动文件
     */
    async renameFile(params: unknown): Promise<{ success: boolean }> {
        const { oldPath, newPath } = params as FileRenameParams;
        const resolvedOld = this.resolvePath(oldPath);
        const resolvedNew = this.resolvePath(newPath);
        const oldUri = vscode.Uri.file(resolvedOld);
        const newUri = vscode.Uri.file(resolvedNew);

        try {
            await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: false });
            return { success: true };
        } catch (error) {
            throw new Error(`重命名失败 ${resolvedOld} → ${resolvedNew}: ${error}`);
        }
    }

    /**
     * 获取文件信息
     */
    async statFile(params: unknown): Promise<{
        type: 'file' | 'directory';
        size?: number;
        mtime?: number;
    }> {
        const { path: filePath } = params as FileStatParams;
        const resolvedPath = this.resolvePath(filePath);
        const uri = vscode.Uri.file(resolvedPath);

        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return {
                type: stat.type === vscode.FileType.Directory ? 'directory' : 'file',
                size: stat.size,
                mtime: stat.mtime,
            };
        } catch (error) {
            throw new Error(`获取文件信息失败 ${resolvedPath}: ${error}`);
        }
    }

    /**
     * 创建目录
     */
    async mkdir(params: unknown): Promise<{ success: boolean }> {
        const { path: dirPath } = params as FileMkdirParams;
        const resolvedPath = this.resolvePath(dirPath);
        const uri = vscode.Uri.file(resolvedPath);

        try {
            await vscode.workspace.fs.createDirectory(uri);
            return { success: true };
        } catch (error) {
            throw new Error(`创建目录失败 ${resolvedPath}: ${error}`);
        }
    }
}
