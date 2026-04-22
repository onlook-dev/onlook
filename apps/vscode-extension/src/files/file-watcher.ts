/**
 * 文件监听管理器
 *
 * 使用 chokidar 监听项目文件变更，
 * 通过 WebSocket 推送变更事件给 Web 客户端。
 *
 * 事件类型：
 * - file.changed: 文件内容变更
 * - file.created: 新文件创建
 * - file.deleted: 文件删除
 *
 * 路径处理：
 * - 输入路径为相对路径（如 './'），需基于 projectPath 解析为绝对路径
 * - 输出路径（事件中的 path）需转为相对路径，与 Web 客户端约定一致
 */

import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { AgentEvents, FileWatchParams } from '../server/protocol';

/** 事件推送回调 */
type EventCallback = (method: string, params: unknown) => void;

/** 监听器实例 */
interface WatcherEntry {
    watcher: chokidar.FSWatcher;
    watchId: string;
    /** 监听时使用的项目根路径（用于将绝对路径转为相对路径） */
    projectPath: string;
}

export class FileWatcherManager {
    private watchers: Map<string, WatcherEntry> = new Map();
    private eventCallback: EventCallback;
    /** 项目根路径（由 AgentServer 在握手后设置） */
    private _projectPath: string = '';

    constructor(eventCallback: EventCallback) {
        this.eventCallback = eventCallback;
    }

    /** 设置项目根路径 */
    set projectPath(p: string) {
        this._projectPath = p;
    }

    get projectPath(): string {
        return this._projectPath;
    }

    /**
     * 将相对路径解析为绝对路径
     */
    private resolvePath(inputPath: string): string {
        if (!this._projectPath) {
            return inputPath;
        }
        if (inputPath === './' || inputPath === '.') {
            return this._projectPath;
        }
        return path.resolve(this._projectPath, inputPath);
    }

    /**
     * 将绝对路径转为相对路径（相对于项目根目录）
     */
    private toRelativePath(absolutePath: string, projectPath: string): string {
        const relative = path.relative(projectPath, absolutePath);
        // 统一使用 / 分隔符，与 Web 端约定一致
        return relative.split(path.sep).join('/');
    }

    /**
     * 开始监听文件变更
     */
    async startWatch(params: unknown): Promise<{ watchId: string }> {
        const { path: watchPath, recursive, excludes } = params as FileWatchParams;
        const watchId = `watch_${Date.now()}`;
        const resolvedWatchPath = this.resolvePath(watchPath);
        const currentProjectPath = this._projectPath;

        // 默认排除的路径
        const defaultExcludes = [
            'node_modules',
            '.git',
            '.next',
            'dist',
            'build',
            '.turbo',
        ];

        const allExcludes = [...defaultExcludes, ...(excludes ?? [])];

        const watcher = chokidar.watch(resolvedWatchPath, {
            // 是否递归监听
            depth: recursive !== false ? undefined : 1,
            // 排除路径
            ignored: allExcludes.map(p => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
            // 忽略初始扫描的 add 事件
            ignoreInitial: true,
            // 使用轮询（某些文件系统需要）
            usePolling: false,
            // 轮询间隔
            interval: 100,
        });

        // 监听文件变更事件（推送相对路径给 Web 端）
        watcher.on('add', (filePath) => {
            this.eventCallback(AgentEvents.FILE_CREATED, {
                type: 'add',
                path: this.toRelativePath(filePath, currentProjectPath),
            });
        });

        watcher.on('change', (filePath) => {
            this.eventCallback(AgentEvents.FILE_CHANGED, {
                type: 'change',
                path: this.toRelativePath(filePath, currentProjectPath),
            });
        });

        watcher.on('unlink', (filePath) => {
            this.eventCallback(AgentEvents.FILE_DELETED, {
                type: 'remove',
                path: this.toRelativePath(filePath, currentProjectPath),
            });
        });

        watcher.on('error', (error) => {
            console.error(`[Onlook FileWatcher] 监听错误:`, error);
        });

        this.watchers.set(watchId, { watcher, watchId, projectPath: currentProjectPath });

        console.info(`[Onlook FileWatcher] 开始监听: ${resolvedWatchPath}`);
        return { watchId };
    }

    /**
     * 停止指定监听
     */
    async stopWatch(params: unknown): Promise<{ success: boolean }> {
        const { watchId } = params as { watchId: string };
        const entry = this.watchers.get(watchId);

        if (entry) {
            await entry.watcher.close();
            this.watchers.delete(watchId);
            console.info(`[Onlook FileWatcher] 停止监听: ${watchId}`);
            return { success: true };
        }

        return { success: false };
    }

    /**
     * 停止所有监听
     */
    async stopAll(): Promise<void> {
        for (const [watchId, entry] of this.watchers.entries()) {
            await entry.watcher.close();
            console.info(`[Onlook FileWatcher] 停止监听: ${watchId}`);
        }
        this.watchers.clear();
    }

    /**
     * 释放所有资源
     */
    async dispose(): Promise<void> {
        await this.stopAll();
    }
}
