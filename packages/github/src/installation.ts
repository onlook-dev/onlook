import { v4 as uuidv4 } from 'uuid';
import { getGitHubAppConfig } from './config';

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
 * Generate a secure installation URL for GitHub App
 */
export function generateInstallationUrl(
    options: InstallationUrlOptions = {}
): { url: string; state: string } {
    const config = getGitHubAppConfig();
    const state = options.state || uuidv4();

    const params = new URLSearchParams({
        state,
    });

    if (options.redirectUrl) {
        params.append('redirect_uri', options.redirectUrl);
    }

    // Use the standard GitHub App installation URL pattern
    // This should work with any properly configured GitHub App
    const url = `https://github.com/apps/${config.slug}/installations/new?${params.toString()}`;

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