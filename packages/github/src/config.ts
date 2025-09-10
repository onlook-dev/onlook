export interface GitHubAppConfig {
    appId: string;
    clientId: string;
    clientSecret: string;
    privateKey: string;
}

/**
 * Validate GitHub App configuration
 */
export function validateGitHubAppConfig(config: Partial<GitHubAppConfig>): config is GitHubAppConfig {
    return !!(
        config.appId &&
        config.clientId &&
        config.clientSecret &&
        config.privateKey
    );
}

/**
 * Get GitHub App configuration from environment variables
 */
export function getGitHubAppConfig(): GitHubAppConfig | null {
    const config = {
        appId: process.env.GITHUB_APP_ID,
        clientId: process.env.GITHUB_APP_CLIENT_ID,
        clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
    };

    if (!validateGitHubAppConfig(config)) {
        return null;
    }

    return config;
}