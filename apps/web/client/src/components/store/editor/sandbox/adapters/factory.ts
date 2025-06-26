import type { EditorEngine } from '../../engine';
import { SandboxProviderType } from '../providers/interface';
import type { SandboxAdapter } from './interface';
import { env } from '@/env';
import { ServerSandboxAdapter } from './server-adapter';

export class SandboxAdapterFactory {
    private static instance: SandboxAdapterFactory;
    private adapters: Map<SandboxProviderType, SandboxAdapter> = new Map();
    
    private constructor() {}
    
    static getInstance(): SandboxAdapterFactory {
        if (!SandboxAdapterFactory.instance) {
            SandboxAdapterFactory.instance = new SandboxAdapterFactory();
        }
        return SandboxAdapterFactory.instance;
    }
    
    getAdapter(providerType: SandboxProviderType): SandboxAdapter {
        if (!this.adapters.has(providerType)) {
            this.adapters.set(providerType, new ServerSandboxAdapter(providerType));
        }
        return this.adapters.get(providerType)!;
    }

    clear(): void {
        this.adapters.clear();
    }

    getDefaultAdapter(editorEngine: EditorEngine): SandboxAdapter {
        if (env.NEXT_PUBLIC_DAYTONA_API_KEY || process.env.DAYTONA_API_KEY) {
            return this.getAdapter(SandboxProviderType.DAYTONA);
        }
        return this.getAdapter(SandboxProviderType.CODESANDBOX);
    }
} 