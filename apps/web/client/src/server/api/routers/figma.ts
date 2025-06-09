import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}

interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

class ServerSideFigmaMCP {
    private readonly MCP_BASE_URL = process.env.MCP_SERVER_URL || 'http://127.0.0.1:3845';
    private requestId = 0;
    private sessionId: string | null = null;
    private messageEndpoint: string | null = null;
    private lastConnectionTime = 0;
    private sessionExpiry = 5 * 60 * 1000; // 5 minutes

    private isSessionValid(): boolean {
        return this.sessionId !== null && 
               this.messageEndpoint !== null && 
               (Date.now() - this.lastConnectionTime) < this.sessionExpiry;
    }

    async connectAndGetSession(): Promise<boolean> {
        // Reuse existing session if still valid
        if (this.isSessionValid()) {
            return true;
        }

        const abortController = new AbortController();
        const connectionTimeout = setTimeout(() => {
            abortController.abort();
        }, 10000);

        try {
            // First, get the session ID by connecting to SSE endpoint
            const response = await fetch(`${this.MCP_BASE_URL}/sse`, {
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`SSE connection failed: ${response.status}`);
            }

            // Reads the SSE stream to get endpoint info
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to read SSE stream');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('event: endpoint')) {
                            continue;
                        }
                        if (line.startsWith('data: ')) {
                            const eventData = line.substring(6);
                            this.messageEndpoint = eventData;
                            
                            // Extracts session ID
                            const sessionMatch = eventData.match(/sessionId=([^&]+)/);
                            if (sessionMatch && sessionMatch[1]) {
                                this.sessionId = sessionMatch[1];
                                this.lastConnectionTime = Date.now();
                                clearTimeout(connectionTimeout);
                                reader.cancel();
                                return true;
                            }
                        }
                    }

                    // Does not wait too long for each chunk
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } finally {
                clearTimeout(connectionTimeout);
                reader.cancel();
            }

            return this.sessionId !== null;
        } catch (error) {
            this.sessionId = null;
            this.messageEndpoint = null;
            clearTimeout(connectionTimeout);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Connection timeout: Failed to establish session within 10 seconds');
            }
            return false;
        }
    }

    async sendMCPRequest(method: string, params?: any): Promise<any> {
        if (!this.isSessionValid()) {
            const connected = await this.connectAndGetSession();
            if (!connected) {
                throw new Error('Failed to connect to Figma MCP server');
            }
        }

        const id = ++this.requestId;
        const request: MCPRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };

        const endpoint = this.messageEndpoint 
            ? `${this.MCP_BASE_URL}${this.messageEndpoint}`
            : `${this.MCP_BASE_URL}/messages?sessionId=${this.sessionId}`;

        const abortController = new AbortController();
        const requestTimeout = setTimeout(() => {
            abortController.abort();
        }, 10000); 

        try {
            // Send the MCP request
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
                signal: abortController.signal
            });

            clearTimeout(requestTimeout);

            if (!response.ok) {
                throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();

            // Listens for the actual response on the SSE endpoint
            return await this.waitForMCPResponse(id);
        } catch (error) {
            clearTimeout(requestTimeout);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout: MCP request (method: ${method}) timed out after 10 seconds`);
            }
            
            throw new Error(`Failed to send MCP request (method: ${method}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async waitForMCPResponse(requestId: number): Promise<any> {
        const abortController = new AbortController();
        const responseTimeout = setTimeout(() => {
            abortController.abort();
        }, 15000);

        try {
            const sseResponse = await fetch(`${this.MCP_BASE_URL}/sse`, {
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                signal: abortController.signal
            });

            if (!sseResponse.ok) {
                throw new Error(`SSE response failed: ${sseResponse.status}`);
            }

            const reader = sseResponse.body?.getReader();
            if (!reader) {
                throw new Error('Failed to read SSE stream');
            }

            return new Promise((resolve, reject) => {
                const decoder = new TextDecoder();
                let buffer = '';

                const cleanup = () => {
                    clearTimeout(responseTimeout);
                    reader.cancel();
                };

                const processStream = async () => {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const eventData = line.substring(6);
                                    
                                    // Skips endpoint info
                                    if (eventData.startsWith('/messages')) {
                                        continue;
                                    }
                                    
                                    try {
                                        const mcpResponse = JSON.parse(eventData) as MCPResponse;
                                        
                                        if (mcpResponse.id === requestId) {
                                            cleanup();
                                            
                                            if (mcpResponse.error) {
                                                reject(new Error(`MCP error: ${mcpResponse.error.message}`));
                                                return;
                                            }
                                            
                                            resolve(mcpResponse.result);
                                            return;
                                        }
                                    } catch (parseError) {
                                        // Continue, this might not be our response
                                    }
                                }
                            }
                        }

                        cleanup();
                        reject(new Error(`No matching response found for request ${requestId}`));
                    } catch (error) {
                        cleanup();
                        reject(error);
                    }
                };

                // Start processing the stream
                processStream();
            });
        } catch (error) {
            clearTimeout(responseTimeout);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Timeout waiting for MCP response ${requestId} after 15 seconds`);
            }
            
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
            const patterns = [
                /node-id=([^&]+)/,
                /\/([^\/]+)\?/,
                /design\/([^\/\?]+)/
            ];

            for (const pattern of patterns) {
                const match = figmaUrl.match(pattern);
                if (match && match[1]) {
                    return decodeURIComponent(match[1]);
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    public getSessionInfo() {
        return {
            isValid: this.isSessionValid(),
            sessionId: this.sessionId,
            lastConnectionTime: this.lastConnectionTime
        };
    }

    public extractContent(data: any): string | null {
        if (!data) return null;
        
        // Handle different response formats
        if (data.content && Array.isArray(data.content)) {
            return data.content.map((item: any) => item.text || item.data || item).join('\n');
        }
        
        if (typeof data === 'string') return data;
        if (data.text) return data.text;
        if (data.data) return data.data;
        
        return JSON.stringify(data, null, 2);
    }

    async safeRequest<T>(requestFn: () => Promise<T>, requestName: string): Promise<T | null> {
        try {
            return await requestFn();
        } catch (error) {   
            return null;
        }
    }
}

const figmaMCP = new ServerSideFigmaMCP();

export const figmaRouter = createTRPCRouter({
    getDesignFromUrl: protectedProcedure
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

                const designData = {
                    node: {
                        id: nodeId,
                        name: 'Figma Design',
                        type: 'FRAME',
                        visible: true
                    },
                    code: figmaMCP.extractContent(codeData),
                    image: figmaMCP.extractContent(imageResult), 
                    variables_defs: figmaMCP.extractContent(variablesResult)
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

    getCurrentSelection: protectedProcedure
        .query(async () => {
            try {
                // Gets code first, then tries others
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

                const designData = {
                    node: {
                        id: 'current-selection',
                        name: 'Figma Current Selection',
                        type: 'FRAME',
                        visible: true
                    },
                    code: figmaMCP.extractContent(codeData),
                    image: figmaMCP.extractContent(imageResult),
                    variables_defs: figmaMCP.extractContent(variablesResult)
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
                throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
            }
        }),

    checkConnection: protectedProcedure
        .query(async () => {
            try {
                const connected = await figmaMCP.connectAndGetSession();
                return {
                    connected,
                    message: connected 
                        ? 'Successfully connected to Figma MCP server' 
                        : 'Failed to connect. Make sure Figma desktop app is running with MCP server enabled.'
                };
            } catch (error) {
                return {
                    connected: false,
                    message: error instanceof Error ? error.message : 'Unknown connection error'
                };
            }
        }),

    extractNodeId: protectedProcedure
        .input(z.object({ figmaUrl: z.string() }))
        .query(({ input }) => {
            const nodeId = figmaMCP.extractNodeIdFromUrl(input.figmaUrl);
            return {
                nodeId,
                valid: !!nodeId
            };
        }),

    // Health check with session info
    getHealthStatus: protectedProcedure
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