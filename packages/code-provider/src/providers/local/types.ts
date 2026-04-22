/**
 * LocalProvider 配置选项
 * 用于通过 WebSocket 连接本地 VSCode/Cursor 扩展
 */

/** WebSocket 连接状态 */
export enum ConnectionState {
    /** 未连接 */
    DISCONNECTED = 'disconnected',
    /** 正在连接 */
    CONNECTING = 'connecting',
    /** 已连接（完成握手） */
    CONNECTED = 'connected',
    /** 正在重连 */
    RECONNECTING = 'reconnecting',
}

/** Dev Server 状态变更事件参数 */
export interface DevServerStatusEvent {
    status: 'starting' | 'running' | 'stopped' | 'error';
    projectPath?: string;
    error?: string;
}

/** 本地项目运行配置 */
export interface LocalConfig {
    /** 开发命令，如 "npm run dev" */
    devCommand: string;
    /** 构建命令，如 "npm run build" */
    buildCommand: string;
    /** 开发服务器端口 */
    port: number;
}

/** LocalProvider 配置 */
export interface LocalProviderOptions {
    /** WebSocket 服务器地址，如 ws://localhost:9527 */
    wsUrl: string;
    /** 连接握手 token，由 Web 端生成并通过 URI 传递给扩展 */
    token: string;
    /** 项目本地路径 */
    projectPath: string;
    /** 本地项目运行配置（devCommand, buildCommand, port） */
    localConfig?: LocalConfig;
    /** Dev Server 状态变更回调（可选） */
    onDevServerStatus?: (event: DevServerStatusEvent) => void;
}

/** WebSocket 消息格式（与扩展端 AgentMessage 对齐） */
export interface WsMessage {
    /** 消息唯一 ID */
    id: string;
    /** 消息类型 */
    type: 'request' | 'response' | 'event';
    /** 方法名 */
    method: string;
    /** 请求参数 */
    params?: unknown;
    /** 响应结果 */
    result?: unknown;
    /** 错误信息 */
    error?: { code: number; message: string };
}
