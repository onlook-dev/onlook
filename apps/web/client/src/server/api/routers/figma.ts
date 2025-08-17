import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

class ServerSideFigmaMCP {
    private readonly MCP_BASE_URL = process.env.MCP_SERVER_URL || 'http://127.0.0.1:3845';
    private requestId = 0;
    private sessionId: string | null = null;
    private lastConnectionTime = 0;
    private sessionExpiry = 5 * 60 * 1000; // 5 minutes
    
    // For persistent SSE connection
    private sseController: AbortController | null = null;
    private pendingRequests = new Map<number, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }>();
    private isConnected = false;

    private isSessionValid(): boolean {
        return this.sessionId !== null && 
               this.isConnected &&
               (Date.now() - this.lastConnectionTime) < this.sessionExpiry;
    }

    async connectAndMaintainSession(): Promise<boolean> {
        if (this.isSessionValid()) {
            return true;
        }

        // Clean up any existing connection
        if (this.sseController) {
            this.sseController.abort();
        }
        
        this.sseController = new AbortController();
        
        try {
            const response = await fetch(`${this.MCP_BASE_URL}/sse`, {
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                signal: this.sseController.signal
            });

            if (!response.ok) {
                throw new Error(`SSE connection failed: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to read SSE stream');
            }

            // Starts processing the SSE stream in the background
            this.processSSEStream(reader);
            
            // Waits for session establishment
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Session establishment timeout'));
                }, 10000);

                const checkSession = () => {
                    if (this.sessionId) {
                        clearTimeout(timeout);
                        resolve(true);
                    } else {
                        setTimeout(checkSession, 100);
                    }
                };
                checkSession();
            });

        } catch (error) {
            this.cleanup();
            console.error('Figma MCP: Failed to establish SSE connection:', error);
            return false;
        }
    }

    private async processSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event: endpoint')) {
                        continue;
                    }
                    if (line.startsWith('data: ')) {
                        const eventData = line.substring(6).trim();
                        
                        // Checks if this is session establishment
                        if (eventData.includes('sessionId=')) {
                            const sessionMatch = /sessionId=([^&]+)/.exec(eventData);
                            if (sessionMatch?.[1]) {
                                this.sessionId = sessionMatch[1];
                                this.lastConnectionTime = Date.now();
                                this.isConnected = true;
                                continue;
                            }
                        }
                        
                        // Try to parse as JSON-RPC response
                        try {
                            const mcpResponse = JSON.parse(eventData);
                            if (mcpResponse.jsonrpc === '2.0' && mcpResponse.id) {
                                this.handleMCPResponse(mcpResponse);
                            }
                        } catch (parseError) {
                            // Not a JSON-RPC response, continue
                        }
                    }
                }
            }
        } catch (error) {
            if (!this.sseController?.signal.aborted) {
                console.error('Figma MCP: SSE stream error:', error);
                this.cleanup();
            }
        }
    }

    private handleMCPResponse(response: any) {
        const requestId = response.id;
        const pending = this.pendingRequests.get(requestId);
        
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(requestId);
            
            if (response.error) {
                pending.reject(new Error(`MCP error: ${response.error.message}`));
            } else {
                pending.resolve(response.result);
            }
        }
    }

    private cleanup() {
        this.isConnected = false;
        this.sessionId = null;
        
        if (this.sseController) {
            this.sseController.abort();
            this.sseController = null;
        }
        
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();
    }

    async sendMCPRequest(method: string, params?: any): Promise<any> {
        if (!this.isSessionValid()) {
            const connected = await this.connectAndMaintainSession();
            if (!connected) {
                throw new Error('Failed to connect to Figma MCP server');
            }
        }

        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0' as const,
            id,
            method,
            ...(params && { params })
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request ${id} timeout after 30 seconds`));
            }, 30000);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            this.sendJSONRPCOverHTTP(request).catch(error => {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(error);
            });
        });
    }

    private async sendJSONRPCOverHTTP(request: any): Promise<void> {
        if (!this.sessionId) {
            throw new Error('No session ID available');
        }

        const endpoint = `${this.MCP_BASE_URL}/messages?sessionId=${this.sessionId}`;
        const abortController = new AbortController();
        
        const timeoutId = setTimeout(() => abortController.abort(), 30000);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const responseText = await response.text();
                throw new Error(`HTTP request failed: ${response.status} ${response.statusText} - ${responseText}`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            console.error('Figma MCP: Failed to send JSON-RPC:', error);
            throw error;
        }
    }

    async getCode(nodeId?: string): Promise<any> {
        const params = nodeId ? { arguments: { node_id: nodeId } } : undefined;
        return await this.sendMCPRequest('tools/call', {
            name: 'get_code',
            ...params
        });
    }

    async getImage(nodeId?: string): Promise<any> {
        const params = nodeId ? { arguments: { node_id: nodeId } } : undefined;
        return await this.sendMCPRequest('tools/call', {
            name: 'get_image',
            ...params
        });
    }

    async getVariableDefs(nodeId?: string): Promise<any> {
        const params = nodeId ? { arguments: { node_id: nodeId } } : undefined;
        return await this.sendMCPRequest('tools/call', {
            name: 'get_variable_defs',
            ...params
        });
    }

    extractNodeIdFromUrl(figmaUrl: string): string | null {
        try {
            const url = new URL(figmaUrl);
            
            // First try to get node-id from query parameters
            const nodeIdParam = url.searchParams.get('node-id');
            if (nodeIdParam) {
                return decodeURIComponent(nodeIdParam);
            }

            // Fallback to regex patterns for edge cases
            const patterns = [
                /node-id=([^&]+)/,
                /\/([^\/]+)\?/,
                /design\/([^\/\?]+)/
            ];

            for (const pattern of patterns) {
                const match = figmaUrl.match(pattern);
                if (match?.[1]) {
                    return decodeURIComponent(match[1]);
                }
            }
            return null;
        } catch (error) {
            console.error('Failed to parse Figma URL:', error);
            return null;
        }
    }

    public getSessionInfo() {
        return {
            isValid: this.isSessionValid(),
            sessionId: this.sessionId,
            isConnected: this.isConnected,
            lastConnectionTime: this.lastConnectionTime
        };
    }

    public extractContent(data: any): string | null {
        if (!data) {
            return null;
        }
        
        // Handle different response formats
        if (data.content && Array.isArray(data.content)) {
            return data.content.map((item: any) => item.text || item.data || item).join('\n');
        }
        
        if (typeof data === 'string') {
            return data;
        }
        if (data.text) {
            return data.text;
        }
        if (data.data) {
            return data.data;
        }
        
        return JSON.stringify(data, null, 2);
    }

    async safeRequest<T>(requestFn: () => Promise<T>, requestName: string): Promise<T | null> {
        try {
            return await requestFn();
        } catch (error) {
            console.error(`Figma MCP ${requestName} failed:`, error);
            return null;
        }
    }
}

const figmaMCP = new ServerSideFigmaMCP();

export const figmaRouter = createTRPCRouter({
    getDesignFromUrl: publicProcedure
        .input(z.object({ figmaUrl: z.string().url() }))
        .query(async ({ input }) => {
            try {
                const nodeId = figmaMCP.extractNodeIdFromUrl(input.figmaUrl);
                if (!nodeId) {
                    throw new Error('Invalid Figma URL: Could not extract node ID');
                }

                // Gets code first, then tries others
                const codeData = await figmaMCP.safeRequest(
                    () => figmaMCP.getCode(nodeId),
                    'Code'
                );

                const [imageData, variablesData] = await Promise.allSettled([
                    figmaMCP.safeRequest(() => figmaMCP.getImage(nodeId), 'Image'),
                    figmaMCP.safeRequest(() => figmaMCP.getVariableDefs(nodeId), 'Variables')
                ]);

                const imageResult = imageData.status === 'fulfilled' ? imageData.value : null;
                const variablesResult = variablesData.status === 'fulfilled' ? variablesData.value : null;

                // Extract content from the responses
                const extractedCode = figmaMCP.extractContent(codeData);
                const extractedImage = figmaMCP.extractContent(imageResult);
                const extractedVariables = figmaMCP.extractContent(variablesResult);

                // If all data is null, the MCP connection likely failed completely
                if (!extractedCode && !extractedImage && !extractedVariables) {
                    throw new Error('Connection to Figma failed or aborted. Try again.');
                }

                const designData = {
                    node: {
                        id: nodeId,
                        name: 'Figma Design',
                        type: 'FRAME',
                        visible: true
                    },
                    code: extractedCode,
                    image: extractedImage,
                    variables_defs: extractedVariables
                };

                return {
                    success: true,
                    data: designData,
                    nodeId,
                    debug: {
                        rawCode: codeData,
                        rawImage: imageResult,
                        rawVariables: variablesResult
                    }
                };
            } catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
            }
        }),

    getCurrentSelection: publicProcedure
        .query(async () => {
            try {
                const codeData = await figmaMCP.safeRequest(
                    () => figmaMCP.getCode(),
                    'Selection Code'
                );

                const [imageData, variablesData] = await Promise.allSettled([
                    figmaMCP.safeRequest(() => figmaMCP.getImage(), 'Selection Image'),
                    figmaMCP.safeRequest(() => figmaMCP.getVariableDefs(), 'Selection Variables')
                ]);

                const imageResult = imageData.status === 'fulfilled' ? imageData.value : null;
                const variablesResult = variablesData.status === 'fulfilled' ? variablesData.value : null;

                const extractedCode = figmaMCP.extractContent(codeData);
                const extractedImage = figmaMCP.extractContent(imageResult);
                const extractedVariables = figmaMCP.extractContent(variablesResult);

                // If all data is null, the MCP connection likely failed completely
                if (!extractedCode && !extractedImage && !extractedVariables) {
                    throw new Error('Connection to Figma failed or aborted. Try again.');
                }

                const designData = {
                    node: {
                        id: 'current-selection',
                        name: 'Figma Current Selection',
                        type: 'FRAME',
                        visible: true
                    },
                    code: extractedCode,
                    image: extractedImage,
                    variables_defs: extractedVariables
                };

                return {
                    success: true,
                    data: designData,
                    debug: {
                        rawCode: codeData,
                        rawImage: imageResult,
                        rawVariables: variablesResult
                    }
                };
            } catch (error) {
                console.error('Figma MCP getCurrentSelection error:', error);
                throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
            }
        }),

    checkConnection: publicProcedure
        .query(async () => {
            try {
                const connected = await figmaMCP.connectAndMaintainSession();
                return {
                    connected,
                    message: connected 
                        ? 'Successfully connected to Figma MCP server' 
                        : 'Failed to connect. Make sure Figma desktop app is running with MCP server enabled.'
                };
            } catch (error) {
                console.error('Figma MCP connection check error:', error);
                return {
                    connected: false,
                    message: error instanceof Error ? error.message : 'Unknown connection error'
                };
            }
        }),

    extractNodeId: publicProcedure
        .input(z.object({ figmaUrl: z.string() }))
        .query(({ input }) => {
            const nodeId = figmaMCP.extractNodeIdFromUrl(input.figmaUrl);
            return {
                nodeId,
                valid: !!nodeId
            };
        }),

    // Health check with session info
    getHealthStatus: publicProcedure
        .query(async () => {
            try {
                const { isValid, sessionId, lastConnectionTime } = figmaMCP.getSessionInfo();
                
                return {
                    sessionValid: isValid,
                    sessionId: sessionId ? sessionId.substring(0, 8) + '...' : null,
                    lastConnection: lastConnectionTime ? new Date(lastConnectionTime).toISOString() : null,
                };
            } catch (error) {
                return {
                    sessionValid: false,
                    sessionId: null,
                    lastConnection: null,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }),
});