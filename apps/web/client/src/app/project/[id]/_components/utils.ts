import { SandboxProviderType } from '@/components/store/editor/sandbox/providers';
import { env } from '@/env';

export function getProviderType(): SandboxProviderType {
    console.log('sandboxUrl', env.NEXT_PUBLIC_DAYTONA_API_KEY);
    if (env.NEXT_PUBLIC_DAYTONA_API_KEY) {
        console.log('DAYTONA_API_KEY', env.NEXT_PUBLIC_DAYTONA_API_KEY);
        return SandboxProviderType.DAYTONA;
    }
    return SandboxProviderType.CODESANDBOX;
}
