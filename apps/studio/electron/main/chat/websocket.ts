import type { StreamRequestV2, StreamResponse } from '@onlook/models/chat';
import { ApiRoutes, BASE_API_ROUTE, FUNCTIONS_ROUTE } from '@onlook/models/constants';
import WebSocket from 'ws';
import { getRefreshedAuthTokens } from '../auth';

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private messageCallback: ((response: StreamResponse) => void) | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    async connect(): Promise<void> {
        const authTokens = await getRefreshedAuthTokens();
        const apiUrl = import.meta.env.VITE_SUPABASE_API_URL;
        if (!apiUrl) {
            throw new Error('VITE_SUPABASE_API_URL is not defined');
        }
        const wsUrl = `${apiUrl.replace('http', 'ws')}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.AI_V3_WS}`;

        this.ws = new WebSocket(wsUrl, {
            headers: {
                Authorization: `Bearer ${authTokens.accessToken}`,
            },
        });

        this.ws.on('open', () => {
            this.reconnectAttempts = 0;
        });

        this.ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString()) as StreamResponse;
                this.messageCallback?.(response);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
                this.messageCallback?.({
                    status: 'error',
                    content: 'Failed to parse server response',
                });
            }
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.messageCallback?.({
                status: 'error',
                content: 'WebSocket connection error',
            });
            this.attemptReconnect();
        });

        this.ws.on('close', () => {
            this.ws = null;
            this.attemptReconnect();
        });
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.messageCallback?.({
                status: 'error',
                content: 'Failed to reconnect to server',
            });
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(
            async () => {
                this.reconnectAttempts++;
                await this.connect();
            },
            Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000),
        );
    }

    setMessageCallback(callback: (response: StreamResponse) => void) {
        this.messageCallback = callback;
    }

    async send(request: StreamRequestV2): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
        this.ws?.send(JSON.stringify(request));
    }

    close() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.ws?.close();
        this.ws = null;
        this.messageCallback = null;
        this.reconnectAttempts = 0;
    }
}
