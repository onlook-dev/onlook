export enum PublishStatus {
    UNPUBLISHED = 'unpublished',
    LOADING = 'loading',
    PUBLISHED = 'published',
    ERROR = 'error',
}

export interface PublishState {
    status: PublishStatus;
    message: string | null;
    buildLog: string | null;
    error: string | null;
    progress: number | null;
}

export interface CustomDomain {
    id: string;
    user_id: string;
    domain: string;
    subdomains: string[];
    created_at: string;
    updated_at: string;
}

export interface CreateDomainVerificationResponse {
    success: boolean;
    message?: string;
    verificationCode?: string;
}

export interface VerifyDomainResponse {
    success: boolean;
    message?: string;
}

export interface PublishOptions {
    skipBadge?: boolean;
    skipBuild?: boolean;
    buildFlags?: string;
    envVars?: Record<string, string>;
}

export interface PublishRequest {
    buildScript: string;
    urls: string[];
    options?: PublishOptions;
}

export interface PublishResponse {
    success: boolean;
    message: string;
}

export enum HostingProvider {
    FREESTYLE = 'freestyle',
}

export interface DeploymentFile {
    content: string;
    encoding?: 'utf-8' | 'base64';
}

export interface DeploymentConfig {
    domains: string[];
    entrypoint?: string;
    envVars?: Record<string, string>;
}

export interface DeploymentRequest {
    files: Record<string, DeploymentFile>;
    config: DeploymentConfig;
}

export interface DeploymentResponse {
    deploymentId: string;
    success: boolean;
    message?: string;
}

export interface HostingProviderAdapter {
    deploy(request: DeploymentRequest): Promise<DeploymentResponse>;
}
