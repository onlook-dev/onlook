import { HostingProvider, type HostingProviderAdapter } from '@onlook/models';
import { FreestyleAdapter } from './adapters/freestyle';

export class HostingProviderFactory {
    static create(provider: HostingProvider = HostingProvider.FREESTYLE): HostingProviderAdapter {
        switch (provider) {
            case HostingProvider.FREESTYLE:
                return new FreestyleAdapter();
            default:
                return new FreestyleAdapter();
        }
    }
} 