import { FreestyleSandboxes } from 'freestyle-sandboxes';
import { 
    FreestyleDeployWebConfiguration, 
    FreestyleDeployWebSuccessResponse, 
    DeploymentSource,
    HandleCreateDomainVerificationResponse 
} from '../types';

export async function freestyleCreateDomainVerification(domain: string): Promise<HandleCreateDomainVerificationResponse> {
    const apiKey = process.env.FREESTYLE_API_KEY;
    if (!apiKey) {
        console.error('Freestyle API key not found.');
        throw new Error('Freestyle API key not found.');
    }

    const res: Response = await fetch('https://api.freestyle.sh/domains/v1/verifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ domain }),
    });

    if (!res.ok) {
        const data = await res.json() as any;
        throw new Error(data.message || 'Unknown error');
    }

    return await res.json() as HandleCreateDomainVerificationResponse;
}

export async function freestyleVerifyDomain(domain: string): Promise<boolean> {
    try {
        const apiKey = process.env.FREESTYLE_API_KEY;
        if (!apiKey) {
            console.error('Freestyle API key not found.');
            throw new Error('Freestyle API key not found.');
        }

        const res: Response = await fetch('https://api.freestyle.sh/domains/v1/verifications', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ domain }),
        });

        const data = await res.json() as any;

        if (!res.ok) {
            throw new Error(data.message || 'Unknown error');
        }

        if (data.type === 'failedToVerifyDomain') {
            throw new Error(data.message || 'Failed to verify domain');
        }

        return true;
    } catch (error) {
        console.error('Error verifying domain:', error);
        return false;
    }
}

export async function freestyleDeployWeb(files: Record<string, {
    content: string;
    encoding?: string;
}>, config: FreestyleDeployWebConfiguration): Promise<FreestyleDeployWebSuccessResponse> {
    const apiKey = process.env.FREESTYLE_API_KEY;
    if (!apiKey) {
        console.error('Freestyle API key not found.');
        throw new Error('Freestyle API key not found.');
    }

    const api = new FreestyleSandboxes({
        apiKey: apiKey,
    });

    const res = await api.deployWeb(
        { files, kind: 'files' },
        config
    );

    return res;
}

export async function freestyleDeployWebV2(source: DeploymentSource, config: FreestyleDeployWebConfiguration): Promise<FreestyleDeployWebSuccessResponse> {
    const apiKey = process.env.FREESTYLE_API_KEY;
    if (!apiKey) {
        console.error('Freestyle API key not found.');
        throw new Error('Freestyle API key not found.');
    }

    const api = new FreestyleSandboxes({
        apiKey: apiKey,
    });

    const res = await api.deployWeb(
        source,
        config
    );

    return res;
}
