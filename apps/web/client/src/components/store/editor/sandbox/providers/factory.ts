import { CodeSandboxProvider } from './codesandbox';
import type { SandboxProvider } from './interface';
import { SandboxProviderType } from './interface';

export class SandboxProviderFactory {
    private static instance: SandboxProviderFactory;
    private providers: Map<SandboxProviderType, SandboxProvider> = new Map();

    private constructor() {}

    static getInstance(): SandboxProviderFactory {
        if (!SandboxProviderFactory.instance) {
            SandboxProviderFactory.instance = new SandboxProviderFactory();
        }
        return SandboxProviderFactory.instance;
    }

    getProvider(type: SandboxProviderType): SandboxProvider {
        if (!this.providers.has(type)) {
            this.providers.set(type, this.createProvider(type));
        }
        return this.providers.get(type)!;
    }

    private createProvider(type: SandboxProviderType): SandboxProvider {
        switch (type) {
            case SandboxProviderType.CODESANDBOX:
                return new CodeSandboxProvider(process.env.CSB_API_KEY!);
            default:
                throw new Error(`Unknown sandbox provider type: ${type}`);
        }
    }

    getDefaultProvider(): SandboxProvider {
        return this.getProvider(SandboxProviderType.CODESANDBOX);
    }
}
