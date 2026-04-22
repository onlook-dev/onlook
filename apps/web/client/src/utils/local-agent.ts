/**
 * 本地 VSCode/Cursor 扩展健康检测
 *
 * 检测本地 Onlook 扩展是否在线，返回连接信息。
 * 扩展启动后会在配置端口（默认 9527）提供 /health 端点。
 */

/** 健康检测结果 */
export interface LocalAgentStatus {
    /** 扩展是否在线 */
    available: boolean;
    /** WebSocket 服务器端口 */
    port?: number;
    /** 扩展版本 */
    version?: string;
    /** 已连接的客户端数 */
    clients?: number;
}

/** 默认端口 */
const DEFAULT_AGENT_PORT = 9527;

/** 健康检测超时（毫秒） */
const HEALTH_CHECK_TIMEOUT = 2000;

/**
 * 检测本地 Onlook 扩展是否在线
 *
 * @param port 指定检测端口，默认 9527
 * @returns 扩展状态信息
 */
export async function detectLocalAgent(port: number = DEFAULT_AGENT_PORT): Promise<LocalAgentStatus> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        const response = await fetch(`http://localhost:${port}/health`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return {
                available: true,
                port: data.port ?? port,
                version: data.version,
                clients: data.clients,
            };
        }
    } catch {
        // 扩展未运行或端口不可达
    }

    return { available: false };
}

/**
 * 扫描常用端口，检测本地扩展
 * 按优先级尝试 9527、9528、9529 端口
 */
export async function scanLocalAgent(): Promise<LocalAgentStatus> {
    const ports = [9527, 9528, 9529];

    for (const port of ports) {
        const status = await detectLocalAgent(port);
        if (status.available) {
            return status;
        }
    }

    return { available: false };
}

/**
 * 从本地扩展获取连接 token
 *
 * Web 端创建本地项目时，需要先调用此函数获取一次性 token，
 * 然后才能与扩展建立 WebSocket 握手。
 *
 * @param port 扩展监听端口
 * @param projectId 项目 ID（可选）
 * @returns token 字符串，获取失败返回 null
 */
export async function fetchLocalAgentToken(port: number, projectId?: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        let url = `http://localhost:${port}/token`;
        if (projectId) {
            url += `?projectId=${encodeURIComponent(projectId)}`;
        }

        const response = await fetch(url, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data.token ?? null;
        }
    } catch {
        // 扩展未运行或端口不可达
    }

    return null;
}
