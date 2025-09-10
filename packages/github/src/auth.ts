import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import type { GitHubAppConfig } from './config';

/**
 * Create an authenticated Octokit instance for GitHub App
 */
export function createAppOctokit(config: GitHubAppConfig): Octokit {
    const auth = createAppAuth({
        appId: config.appId,
        privateKey: config.privateKey,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
    });

    return new Octokit({ auth });
}

/**
 * Create an authenticated Octokit instance for a specific installation
 */
export function createInstallationOctokit(
    config: GitHubAppConfig,
    installationId: string
): Octokit {
    if (!installationId || installationId.trim() === '') {
        throw new Error('Installation ID is required and cannot be empty.');
    }

    const auth = createAppAuth({
        appId: config.appId,
        privateKey: config.privateKey,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        installationId: parseInt(installationId, 10),
    });

    return new Octokit({ auth });
}