import { api } from '@/trpc/client';
import { fetchLocalAgentToken } from '@/utils/local-agent';
import { CodeProvider, createCodeProviderClient, type Provider } from '@onlook/code-provider';
import type { DevServerStatusEvent, LocalConfig } from '@onlook/code-provider';
import type { Branch } from '@onlook/models';
import { ProjectEnvironment } from '@onlook/models';
import { makeAutoObservable, runInAction } from 'mobx';
import type { ErrorManager } from '../error';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

/** 从 URL 参数中提取本地 Agent 连接信息 */
interface LocalAgentParams {
    wsUrl: string;
    token: string;
    projectPath: string;
}

/** 从当前页面 URL 读取本地 Agent 连接参数 */
function getLocalAgentParamsFromUrl(): LocalAgentParams | null {
    if (typeof window === 'undefined') { return null; }

    const params = new URLSearchParams(window.location.search);
    const localAgent = params.get('localAgent');
    const token = params.get('token');
    const workspacePath = params.get('workspacePath');

    if (!localAgent || !token) { return null; }

    return {
        wsUrl: `ws://localhost:${localAgent}`,
        token,
        projectPath: workspacePath ?? '',
    };
}

export class SessionManager {
    provider: Provider | null = null;
    isConnecting = false;
    terminalSessions = new Map<string, CLISession>();
    activeTerminalSessionId = 'cli';
    /** Dev Server 最新状态（用于 UI 层订阅，显示端口冲突等错误） */
    devServerStatus: DevServerStatusEvent | null = null;

    constructor(
        private readonly branch: Branch,
        private readonly errorManager: ErrorManager
    ) {
        makeAutoObservable(this);
    }

    /** 当前分支的运行环境 */
    get environment(): ProjectEnvironment {
        return this.branch.environment ?? ProjectEnvironment.SANDBOX;
    }

    async start(sandboxId?: string | null, userId?: string): Promise<void> {
        // 本地环境：通过 LocalProvider 连接 VSCode 扩展的 WebSocket 服务器
        if (this.environment === ProjectEnvironment.LOCAL_VSCODE) {
            await this.startLocal();
            return;
        }

        // 沙箱环境：必须有 sandboxId
        if (!sandboxId) {
            throw new Error('[SessionManager] 沙箱环境需要 sandboxId');
        }

        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 2000;

        if (this.isConnecting || this.provider) {
            return;
        }

        this.isConnecting = true;

        const attemptConnection = async () => {
            const provider = await createCodeProviderClient(CodeProvider.CodeSandbox, {
                providerOptions: {
                    codesandbox: {
                        sandboxId,
                        userId,
                        initClient: true,
                        getSession: async (sandboxId, userId) => {
                            return api.sandbox.start.mutate({ sandboxId });
                        },
                    },
                },
            });

            this.provider = provider;
            await this.createTerminalSessions(provider);
        };

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                await attemptConnection();
                this.isConnecting = false;
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.error(`Failed to start sandbox session (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error);

                this.provider = null;

                if (attempt < MAX_RETRIES) {
                    console.log(`Retrying sandbox connection in ${RETRY_DELAY_MS}ms...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }
            }
        }

        this.isConnecting = false;
        throw lastError;
    }

    /**
     * 启动本地 VSCode 环境连接
     * 从 URL 参数读取 WebSocket 地址和 token，创建 LocalProvider
     *
     * token 获取优先级：
     * 1. URL 参数中的 token（由 top-bar 或扩展入口2传入）
     * 2. 通过 /token 端点动态获取（扩展在线时）
     */
    private async startLocal(): Promise<void> {
        if (this.isConnecting || this.provider) {
            return;
        }

        this.isConnecting = true;

        try {
            // 从 URL 参数获取本地 Agent 连接信息
            const localParams = getLocalAgentParamsFromUrl();
            let wsUrl: string;
            let token: string;
            let projectPath: string;

            if (localParams) {
                // URL 中有完整参数
                wsUrl = localParams.wsUrl;
                token = localParams.token;
                projectPath = this.branch.localPath ?? localParams.projectPath;
            } else {
                // URL 中缺少 token，尝试从 URL 中的 localAgent 端口动态获取
                const params = new URLSearchParams(window.location.search);
                const localAgentPort = params.get('localAgent');

                if (!localAgentPort) {
                    throw new Error('[SessionManager] 本地环境缺少连接参数（URL 中未找到 localAgent）');
                }

                wsUrl = `ws://localhost:${localAgentPort}`;
                projectPath = this.branch.localPath ?? '';

                // 尝试从扩展 /token 端点获取 token
                const port = parseInt(localAgentPort, 10);
                const fetchedToken = await fetchLocalAgentToken(port, this.branch.projectId);

                if (!fetchedToken) {
                    throw new Error('[SessionManager] 无法获取连接 token，请确保 VSCode 扩展正在运行并执行"Onlook: Open in Browser"');
                }

                token = fetchedToken;
            }

            console.info(`[SessionManager] 连接本地 VSCode 扩展: ${wsUrl}`);

            // 构造 localConfig，优先使用 branch 中保存的配置
            const localConfig: LocalConfig | undefined = this.branch.localConfig ?? undefined;

            const provider = await createCodeProviderClient(CodeProvider.Local, {
                providerOptions: {
                    local: {
                        wsUrl,
                        token,
                        projectPath,
                        localConfig,
                        onDevServerStatus: (event: DevServerStatusEvent) => {
                            runInAction(() => {
                                this.devServerStatus = event;
                            });
                        },
                    },
                },
            });

            this.provider = provider;
            await this.createTerminalSessions(provider);
            console.info('[SessionManager] 本地 VSCode 扩展连接成功');
        } catch (error) {
            console.error('[SessionManager] 连接本地 VSCode 扩展失败:', error);
            this.provider = null;
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    async restartDevServer(): Promise<boolean> {
        if (!this.provider) {
            console.error('No provider found in restartDevServer');
            return false;
        }
        const { task } = await this.provider.getTask({
            args: {
                id: 'dev',
            },
        });
        if (task) {
            await task.restart();
            return true;
        }
        return false;
    }

    /** 更新 provider 中的 localConfig（设置 UI 保存后调用，确保重启时使用新配置） */
    updateLocalConfig(localConfig: LocalConfig): void {
        if (this.provider && 'updateLocalConfig' in this.provider) {
            (this.provider as any).updateLocalConfig(localConfig);
        }
    }

    async readDevServerLogs(): Promise<string> {
        const result = await this.provider?.getTask({ args: { id: 'dev' } });
        if (result) {
            return await result.task.open();
        }
        return 'Dev server not found';
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    async createTerminalSessions(provider: Provider) {
        const task = new CLISessionImpl(
            'server',
            CLISessionType.TASK,
            provider,
            this.errorManager,
        );
        this.terminalSessions.set(task.id, task);
        const terminal = new CLISessionImpl(
            'terminal',
            CLISessionType.TERMINAL,
            provider,
            this.errorManager,
        );

        this.terminalSessions.set(terminal.id, terminal);
        this.activeTerminalSessionId = task.id;

        // Initialize the sessions after creation
        try {
            await Promise.all([
                task.initTask(),
                terminal.initTerminal()
            ]);
        } catch (error) {
            console.error('Failed to initialize terminal sessions:', error);
        }
    }

    async disposeTerminal(id: string) {
        const terminal = this.terminalSessions.get(id) as TerminalSession | undefined;
        if (terminal) {
            if (terminal.type === CLISessionType.TERMINAL) {
                await terminal.terminal?.kill();
                if (terminal.xterm) {
                    terminal.xterm.dispose();
                }
            }
            this.terminalSessions.delete(id);
        }
    }

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect(sandboxId?: string | null, userId?: string) {
        try {
            if (!this.provider) {
                console.error('No provider found in reconnect');
                return;
            }

            // Check if the session is still connected
            const isConnected = await this.ping();
            if (isConnected) {
                return;
            }

            // Attempt soft reconnect
            await this.provider?.reconnect();

            const isConnected2 = await this.ping();
            if (isConnected2) {
                return;
            }
            await this.restartProvider(sandboxId, userId);
        } catch (error) {
            console.error('Failed to reconnect to sandbox', error);
            this.isConnecting = false;
        }
    }

    async restartProvider(sandboxId?: string | null, userId?: string) {
        if (!this.provider) {
            return;
        }
        await this.provider.destroy();
        this.provider = null;
        await this.start(sandboxId, userId);
    }

    async ping() {
        if (!this.provider) return false;
        try {
            await this.provider.runCommand({ args: { command: 'echo "ping"' } });
            return true;
        } catch (error) {
            console.error('Failed to connect to sandbox', error);
            return false;
        }
    }

    async runCommand(
        command: string,
        streamCallback?: (output: string) => void,
        ignoreError: boolean = false,
    ): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        try {
            if (!this.provider) {
                throw new Error('No provider found in runCommand');
            }

            // Append error suppression if ignoreError is true
            const finalCommand = ignoreError ? `${command} 2>/dev/null || true` : command;

            streamCallback?.(finalCommand + '\n');
            const { output } = await this.provider.runCommand({ args: { command: finalCommand } });
            streamCallback?.(output);
            return {
                output,
                success: true,
                error: null,
            };
        } catch (error) {
            console.error('Error running command:', error);
            return {
                output: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    async clear() {
        // probably need to be moved in `Provider.destroy()`
        this.terminalSessions.forEach((terminal) => {
            if (terminal.type === CLISessionType.TERMINAL) {
                terminal.terminal?.kill();
                if (terminal.xterm) {
                    terminal.xterm.dispose();
                }
            }
        });
        if (this.provider) {
            await this.provider.destroy();
        }
        this.provider = null;
        this.isConnecting = false;
        this.terminalSessions.clear();
        this.devServerStatus = null;
    }
}
