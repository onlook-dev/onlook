import type { FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { initializeFreestyleSdk } from '../freestyle';
import {
    type HostingProviderAdapter,
    type DeploymentRequest,
    type DeploymentResponse,
} from '@onlook/models';

export class FreestyleAdapter implements HostingProviderAdapter {
    async deploy(request: DeploymentRequest): Promise<DeploymentResponse> {
        const sdk = initializeFreestyleSdk();

        if (request.type === 'url') {
            const res = await sdk.deployWeb(
                { kind: 'tar', url: request.sourceUrl },
                request.config,
            );

            const freestyleResponse = res as {
                message?: string;
                error?: { message: string };
                data?: FreestyleDeployWebSuccessResponseV2;
            };

            if (freestyleResponse.error) {
                throw new Error(
                    freestyleResponse.error.message ?? freestyleResponse.message ?? 'Unknown error',
                );
            }

            return {
                deploymentId: freestyleResponse.data?.deploymentId ?? '',
                success: true,
                message: freestyleResponse.message,
            };
        }

        const res = await sdk.deployWeb(
            {
                files: request.files ?? {},
                kind: 'files',
            },
            request.config,
        );

        const freestyleResponse = res as {
            message?: string;
            error?: {
                message: string;
            };
            data?: FreestyleDeployWebSuccessResponseV2;
        };

        if (freestyleResponse.error) {
            throw new Error(
                freestyleResponse.error.message ?? freestyleResponse.message ?? 'Unknown error',
            );
        }

        return {
            deploymentId: freestyleResponse.data?.deploymentId ?? '',
            success: true,
            message: freestyleResponse.message,
        };
    }
}
