import * as crypto from 'crypto';
import type { GitHubAppConfig } from './config';

export interface InstallationUrlOptions {
    state?: string;
    redirectUrl?: string;
}

export interface InstallationCallbackData {
    installationId: string;
    setupAction: string;
    state?: string;
}

/**
 * Get app slug from app ID
 * This should be the actual slug of your GitHub App
 */
function getAppSlug(): string {
    // You need to replace this with your actual GitHub App slug
    // You can find this in your GitHub App settings URL: https://github.com/settings/apps/YOUR_SLUG_HERE
    const slug = process.env.GITHUB_APP_SLUG;

    if (!slug) {
        throw new Error('GITHUB_APP_SLUG environment variable is required. Please check your GitHub App settings to find the correct slug.');
    }

    return slug;
}

/**
 * Generate a secure installation URL for GitHub App
 */
export function generateInstallationUrl(
    config: GitHubAppConfig,
    options: InstallationUrlOptions = {}
): { url: string; state: string } {
    const state = options.state || crypto.randomBytes(32).toString('hex');

    const params = new URLSearchParams({
        client_id: config.clientId,
        state,
    });

    if (options.redirectUrl) {
        params.append('redirect_uri', options.redirectUrl);
    }

    // Use the standard GitHub App installation URL pattern
    // This should work with any properly configured GitHub App
    const url = `https://github.com/apps/${getAppSlug()}/installations/new?${params.toString()}`;

    return { url, state };
}

/**
 * Handle GitHub App installation callback
 */
export function handleInstallationCallback(
    query: Record<string, string | string[] | undefined>
): InstallationCallbackData | null {
    const installationId = Array.isArray(query.installation_id)
        ? query.installation_id[0]
        : query.installation_id;

    const setupAction = Array.isArray(query.setup_action)
        ? query.setup_action[0]
        : query.setup_action;

    const state = Array.isArray(query.state)
        ? query.state[0]
        : query.state;

    if (!installationId || !setupAction) {
        return null;
    }

    return {
        installationId,
        setupAction,
        state,
    };
}