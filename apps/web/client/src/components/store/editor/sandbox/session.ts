import { api } from '@/trpc/client';
import type { SandboxSession } from '@codesandbox/sdk';
import { connectToSandbox } from '@codesandbox/sdk/browser';
import { makeAutoObservable } from 'mobx';

export class SessionManager {
    session: SandboxSession | null = null;
    isConnecting = false;

    constructor() {
        makeAutoObservable(this);
    }

    async start(sandboxId: string) {
        this.isConnecting = true;
        const startData = await api.sandbox.start.mutate({ sandboxId });
        this.session = await connectToSandbox(startData);
        this.isConnecting = false;
    }

    async hibernate(sandboxId: string) {
        await api.sandbox.hibernate.mutate({ sandboxId });
    }

    async reconnect() {
        if (!this.session) {
            console.error('No session found');
            return;
        }
        const sandboxId = this.session.id;
        this.session.disconnect();
        this.session = null;
        this.isConnecting = true;
        const startData = await api.sandbox.reconnect.mutate({ sandboxId });
        this.session = await connectToSandbox(startData);
        this.isConnecting = false;
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
