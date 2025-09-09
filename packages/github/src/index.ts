export interface InstallationCallbackParams {
    installation_id: string;
    setup_action: 'install' | 'update';
    state?: string;
}

/**
 * Generate GitHub App installation URL
 */
export function generateInstallationUrl(
    appSlug: string,
    options?: {
        state?: string;
        repositoryIds?: number[];
    },
): string {
    const baseUrl = `https://github.com/apps/${appSlug}/installations/new`;
    const params = new URLSearchParams();

    if (options?.state) {
        params.append('state', options.state);
    }
    if (options?.repositoryIds?.length) {
        params.append('repository_ids', options.repositoryIds.join(','));
    }

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

/**
 * Handle GitHub App installation callback
 */
export function handleInstallationCallback(params: InstallationCallbackParams) {
    const installationId = parseInt(params.installation_id);

    if (isNaN(installationId)) {
        throw new Error('Invalid installation_id');
    }

    return {
        installationId,
        setupAction: params.setup_action,
        isNewInstallation: params.setup_action === 'install',
        isUpdate: params.setup_action === 'update',
    };
}
