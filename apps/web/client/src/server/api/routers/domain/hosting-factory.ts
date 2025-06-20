import { HostingProvider, type HostingProviderAdapter } from '@onlook/models';
import { FreestyleAdapter } from './adapters/freestyle';

export class HostingProviderFactory {
    static create(provider: HostingProvider = HostingProvider.FREESTYLE): HostingProviderAdapter {
        switch (provider) {
            case HostingProvider.FREESTYLE:
                return new FreestyleAdapter();
            default:
                throw new Error(`Unsupported hosting provider: ${provider}`);
        }
    }
} 