import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import * as crypto from 'crypto';

export * from './types';

export interface GitHubAppConfig {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
}

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
  const auth = createAppAuth({
    appId: config.appId,
    privateKey: config.privateKey,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    installationId: parseInt(installationId, 10),
  });

  return new Octokit({ auth });
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