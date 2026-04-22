/**
 * Onlook 扩展通信协议定义
 *
 * 定义 WebSocket 消息格式、方法列表、事件列表。
 * 该协议对齐 @onlook/code-provider 的 Provider 接口，
 * 使得 Web 客户端的 LocalProvider 可以无缝对接。
 */

/** WebSocket 消息基础格式 */
export interface AgentMessage {
    /** 消息唯一 ID，用于请求-响应关联 */
    id: string;
    /** 消息类型 */
    type: 'request' | 'response' | 'event';
    /** 方法名（请求时）或对应的方法名（响应/事件时） */
    method: string;
    /** 请求参数 */
    params?: unknown;
    /** 响应结果 */
    result?: unknown;
    /** 错误信息 */
    error?: AgentError;
}

/** 错误格式 */
export interface AgentError {
    code: number;
    message: string;
}

// ==================== 请求方法 ====================

/** 握手验证 */
export interface HandshakeParams {
    token: string;
    /** Web 客户端来源域名 */
    origin?: string;
    /** 项目 ID */
    projectId?: string;
    /** 项目本地路径（绝对路径，用于解析文件操作的相对路径） */
    projectPath?: string;
}

/** 文件读取参数 */
export interface FileReadParams {
    path: string;
    encoding?: 'utf-8' | 'binary';
}

/** 文件写入参数 */
export interface FileWriteParams {
    path: string;
    content: string;
    overwrite?: boolean;
}

/** 文件删除参数 */
export interface FileDeleteParams {
    path: string;
    recursive?: boolean;
}

/** 文件列表参数 */
export interface FileListParams {
    path: string;
    recursive?: boolean;
}

/** 文件重命名参数 */
export interface FileRenameParams {
    oldPath: string;
    newPath: string;
}

/** 文件信息参数 */
export interface FileStatParams {
    path: string;
}

/** 创建目录参数 */
export interface FileMkdirParams {
    path: string;
}

/** 文件监听参数 */
export interface FileWatchParams {
    path: string;
    recursive?: boolean;
    excludes?: string[];
}

/** 终端创建参数 */
export interface TerminalCreateParams {
    cwd?: string;
}

/** 终端写入参数 */
export interface TerminalWriteParams {
    terminalId: string;
    data: string;
}

/** 终端终止参数 */
export interface TerminalKillParams {
    terminalId: string;
}

/** Dev Server 启动参数 */
export interface DevServerStartParams {
    projectPath: string;
    /** 开发命令，如 "npm run dev" */
    devCommand?: string;
    /** 首选端口 */
    port?: number;
}

/** Dev Server 停止参数 */
export interface DevServerStopParams {
    projectPath: string;
}

/** Dev Server 重启参数 */
export interface DevServerRestartParams {
    projectPath: string;
    /** 开发命令（可选，不传则使用之前的配置） */
    devCommand?: string;
    /** 端口（可选，不传则使用之前的配置） */
    port?: number;
}

/** 项目创建参数 */
export interface ProjectCreateParams {
    name: string;
    parentPath: string;
    template?: string;
}

/** 项目从 Git 创建参数 */
export interface ProjectCreateFromGitParams {
    repoUrl: string;
    branch: string;
    parentPath: string;
}

/** IDE 打开文件参数 */
export interface IdeOpenFileParams {
    filePath: string;
    line?: number;
    column?: number;
}

/** IDE 打开文件夹参数 */
export interface IdeOpenFolderParams {
    folderPath: string;
}

// ==================== 方法名常量 ====================

/** 所有可用的请求方法 */
export const AgentMethods = {
    // 连接
    HANDSHAKE: 'connect.handshake',
    PING: 'connect.ping',

    // 文件操作
    FILE_READ: 'file.read',
    FILE_WRITE: 'file.write',
    FILE_DELETE: 'file.delete',
    FILE_LIST: 'file.list',
    FILE_RENAME: 'file.rename',
    FILE_STAT: 'file.stat',
    FILE_MKDIR: 'file.mkdir',

    // 文件监听
    FILE_WATCH_START: 'file.watch.start',
    FILE_WATCH_STOP: 'file.watch.stop',

    // 终端
    TERMINAL_CREATE: 'terminal.create',
    TERMINAL_WRITE: 'terminal.write',
    TERMINAL_KILL: 'terminal.kill',

    // Dev Server
    DEV_SERVER_START: 'devServer.start',
    DEV_SERVER_STOP: 'devServer.stop',
    DEV_SERVER_RESTART: 'devServer.restart',

    // 项目
    PROJECT_CREATE: 'project.create',
    PROJECT_CREATE_FROM_GIT: 'project.createFromGit',

    // IDE
    IDE_OPEN_FILE: 'ide.openFile',
    IDE_OPEN_FOLDER: 'ide.openFolder',
} as const;

export type AgentMethodType = (typeof AgentMethods)[keyof typeof AgentMethods];

// ==================== 推送事件 ====================

/** 文件变更事件 */
export interface FileChangeEvent {
    type: 'add' | 'change' | 'remove';
    path: string;
}

/** Dev Server 状态事件 */
export interface DevServerStatusEvent {
    status: 'starting' | 'running' | 'stopped' | 'error';
    projectPath?: string;
    error?: string;
}

/** 终端输出事件 */
export interface TerminalOutputEvent {
    terminalId: string;
    data: string;
}

/** 扩展就绪事件 */
export interface ConnectReadyEvent {
    port: number;
    version: string;
}

/** 所有可用的推送事件 */
export const AgentEvents = {
    FILE_CHANGED: 'file.changed',
    FILE_CREATED: 'file.created',
    FILE_DELETED: 'file.deleted',
    DEV_SERVER_STATUS: 'devServer.status',
    TERMINAL_OUTPUT: 'terminal.output',
    CONNECT_READY: 'connect.ready',
} as const;

export type AgentEventType = (typeof AgentEvents)[keyof typeof AgentEvents];

// ==================== 工具函数 ====================

/** 创建请求消息 */
export function createRequest(id: string, method: string, params?: unknown): AgentMessage {
    return { id, type: 'request', method, params };
}

/** 创建响应消息 */
export function createResponse(id: string, method: string, result?: unknown, error?: AgentError): AgentMessage {
    return { id, type: 'response', method, result, error };
}

/** 创建事件消息 */
export function createEvent(method: string, params?: unknown): AgentMessage {
    return { id: '', type: 'event', method, params };
}

/** 创建错误响应 */
export function createErrorResponse(id: string, method: string, code: number, message: string): AgentMessage {
    return { id, type: 'response', method, error: { code, message } };
}
