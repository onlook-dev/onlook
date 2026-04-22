/**
 * 安全模块 - Token 验证与域名白名单
 *
 * Token 流程：
 * 1. Web 端生成一次性 token
 * 2. Token 通过 URI 传递给扩展（vscode://onlook.onlook-local/connect?token=xxx）
 * 3. 扩展存储 token
 * 4. WebSocket 连接时携带 token，扩展验证匹配
 */

import * as vscode from 'vscode';

/** Token 存储项 */
interface PendingToken {
    token: string;
    createdAt: number;
    /** 关联的 Web 端来源 URL */
    origin?: string;
    /** 关联的项目 ID */
    projectId?: string;
}

/** Token 有效期：5 分钟 */
const TOKEN_TTL_MS = 5 * 60 * 1000;

export class SecurityManager {
    /** 待验证的 token 列表 */
    private pendingTokens: Map<string, PendingToken> = new Map();

    /** 已验证的连接 token */
    private verifiedTokens: Set<string> = new Set();

    /** 域名白名单 */
    private allowedOrigins: string[];

    constructor(private context: vscode.ExtensionContext) {
        // 从配置读取域名白名单
        this.allowedOrigins = vscode.workspace
            .getConfiguration('onlook')
            .get<string[]>('allowedOrigins', ['localhost', '127.0.0.1', '*.onlook.com']);

        // 监听配置变更
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('onlook.allowedOrigins')) {
                    this.allowedOrigins = vscode.workspace
                        .getConfiguration('onlook')
                        .get<string[]>('allowedOrigins', ['localhost', '127.0.0.1', '*.onlook.com']);
                }
            })
        );
    }

    /**
     * 注册一个 token（从 URI 传入）
     * @returns 注册的 token
     */
    registerToken(origin?: string, projectId?: string): string {
        const token = crypto.randomUUID();
        this.pendingTokens.set(token, {
            token,
            createdAt: Date.now(),
            origin,
            projectId,
        });

        // 清理过期 token
        this.cleanExpiredTokens();

        return token;
    }

    /**
     * 注册一个外部传入的 token（从 URI 或 /token 端点获取）
     * 与 registerToken() 不同，此方法接受已有的 token 字符串
     */
    registerExternalToken(token: string, origin?: string, projectId?: string): void {
        this.pendingTokens.set(token, {
            token,
            createdAt: Date.now(),
            origin,
            projectId,
        });

        this.cleanExpiredTokens();
    }

    /**
     * 验证 WebSocket 连接的 token
     * @returns 验证结果和关联信息
     */
    validateConnection(token: string, origin?: string): {
        valid: boolean;
        projectId?: string;
    } {
        // 清理过期 token
        this.cleanExpiredTokens();

        // 检查 token 是否在待验证列表中
        const pending = this.pendingTokens.get(token);
        if (!pending) {
            // 也检查已验证列表（支持重连）
            if (this.verifiedTokens.has(token)) {
                return { valid: true };
            }
            return { valid: false };
        }

        // 域名白名单验证（可选）
        if (origin && this.allowedOrigins.length > 0) {
            if (!this.matchOrigin(origin, this.allowedOrigins)) {
                console.warn(`[Onlook Security] Origin ${origin} 不在白名单中`);
                return { valid: false };
            }
        }

        // 验证通过，移动到已验证列表
        this.pendingTokens.delete(token);
        this.verifiedTokens.add(token);

        return {
            valid: true,
            projectId: pending.projectId,
        };
    }

    /**
     * 撤销已验证的 token
     */
    revokeToken(token: string): void {
        this.verifiedTokens.delete(token);
        this.pendingTokens.delete(token);
    }

    /**
     * 检查域名是否匹配白名单
     * 支持通配符，如 *.onlook.com
     */
    private matchOrigin(origin: string, patterns: string[]): boolean {
        try {
            const originHost = new URL(origin).hostname;

            for (const pattern of patterns) {
                if (pattern.startsWith('*.')) {
                    // 通配符匹配：*.onlook.com 匹配 sub.onlook.com 和 onlook.com
                    const domain = pattern.slice(2);
                    if (originHost === domain || originHost.endsWith('.' + domain)) {
                        return true;
                    }
                } else {
                    // 精确匹配或后缀匹配
                    if (originHost === pattern || originHost.endsWith('.' + pattern)) {
                        return true;
                    }
                }
            }
            return false;
        } catch {
            // URL 解析失败，尝试直接匹配
            return patterns.some(p => origin.includes(p));
        }
    }

    /**
     * 清理过期的待验证 token
     */
    private cleanExpiredTokens(): void {
        const now = Date.now();
        for (const [token, pending] of this.pendingTokens.entries()) {
            if (now - pending.createdAt > TOKEN_TTL_MS) {
                this.pendingTokens.delete(token);
            }
        }
    }
}
