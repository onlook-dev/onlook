import type { FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { initializeFreestyleSdk } from '../freestyle';
import type {
    HostingProviderAdapter,
    DeploymentRequest,
    DeploymentResponse
} from '@onlook/models';

export class FreestyleAdapter implements HostingProviderAdapter {
    async deploy(request: DeploymentRequest): Promise<DeploymentResponse> {
        const sdk = initializeFreestyleSdk();
        
        const res = await sdk.deployWeb(
            {
                files: request.files,
                kind: 'files',
            },
            request.config
        );
        
        const freestyleResponse = (await res) as {
            message?: string;
            error?: {
                message: string;
            };
            data?: FreestyleDeployWebSuccessResponseV2;
        };
        
        if (!res) {
            throw new Error(
                freestyleResponse.error?.message || 
                freestyleResponse.message || 
                'Unknown error'
            );
        }
        
        return {
            deploymentId: freestyleResponse.data?.deploymentId ?? '',
            success: true
        };
    }
} 