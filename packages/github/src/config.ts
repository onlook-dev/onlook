export interface GitHubAppConfig {
    appId: string;
    privateKey: string;
    slug: string;
}

/**
 * Validate GitHub App configuration
 */
export function validateGitHubAppConfig(config: Partial<GitHubAppConfig>): config is GitHubAppConfig {
    return !!(
        config.appId &&
        config.privateKey &&
        config.slug
    );
}

/**
 * Get GitHub App configuration from environment variables
 * Throws an error if configuration is invalid
 */
export function getGitHubAppConfig(): GitHubAppConfig {
    const config = {
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
        slug: process.env.GITHUB_APP_SLUG,
    };

    if (!validateGitHubAppConfig(config)) {
        throw new Error('GitHub App configuration is missing or invalid. Please check your environment variables: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_SLUG');
    }

    return config;
}