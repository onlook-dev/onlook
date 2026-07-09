import type { FreestyleDeployWebSuccessResponseV2 } from 'freestyle-sandboxes';
import { initializeFreestyleSdk } from '../freestyle';
import type {
    HostingProviderAdapter,
    DeploymentRequest,
    DeploymentResponse
} from '@onlook/models';

// File upload validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total
const MAX_FILES = 1000;
const ALLOWED_FILE_TYPES = [
    'text/html',
    'text/css',
    'application/javascript',
    'text/javascript',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
];

export class FreestyleAdapter implements HostingProviderAdapter {
    private validateFileUploads(files: Record<string, Blob>): void {
        // Validate number of files
        const fileCount = Object.keys(files).length;
        if (fileCount === 0) {
            throw new Error('No files provided');
        }
        if (fileCount > MAX_FILES) {
            throw new Error(`Too many files. Maximum allowed: ${MAX_FILES}`);
        }

        // Validate individual files and calculate total size
        let totalSize = 0;
        for (const [filename, file] of Object.entries(files)) {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                throw new Error(`File "${filename}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            }

            // Validate file type
            if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
                throw new Error(`File type "${file.type}" for "${filename}" is not allowed`);
            }

            totalSize += file.size;
        }

        // Validate total size
        if (totalSize > MAX_TOTAL_SIZE) {
            throw new Error(`Total file size exceeds maximum of ${MAX_TOTAL_SIZE / 1024 / 1024}MB`);
        }
    }

    async deploy(request: DeploymentRequest): Promise<DeploymentResponse> {
        // Validate file uploads before processing
        this.validateFileUploads(request.files);

        const sdk = initializeFreestyleSdk();
        
        const res = await sdk.deployWeb(
            {
                files: request.files,
                kind: 'files',
            },
            request.config
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
                freestyleResponse.error.message || 
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