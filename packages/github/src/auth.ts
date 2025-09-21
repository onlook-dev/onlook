import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { getGitHubAppConfig } from './config';

/**
 * Create an authenticated Octokit instance for a specific installation
 */
export function createInstallationOctokit(installationId: string): Octokit {
    const config = getGitHubAppConfig();
    if (!installationId || installationId.trim() === '') {
        throw new Error('Installation ID is required and cannot be empty.');
    }

    return new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: config.appId,
            privateKey: config.privateKey,
            installationId: parseInt(installationId, 10),
        },
    });
}