import { api } from '@/trpc/client';
import type { WebSocketSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { makeAutoObservable } from 'mobx';

export class SessionManager {
    session: WebSocketSession | null = null;
    isConnecting = false;

    constructor() {
        makeAutoObservable(this);
    }

    async start(sandboxId: string, userId: string) {
        this.isConnecting = true;
        this.session = await connectToSandbox({
            session: await api.sandbox.start.mutate({ sandboxId, userId }),
            getSession: async (id) => {
                return await api.sandbox.start.mutate({ sandboxId, userId });
            },
        });
        this.isConnecting = false;
    }

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect() {
        await this.session?.reconnect();
    }

    async disconnect() {
        if (!this.session) {
            console.error('No session found');
            return;
        }
        await this.session.disconnect();
        this.session = null;
        this.isConnecting = false;
    }
}
