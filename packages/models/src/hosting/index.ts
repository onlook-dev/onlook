export enum DeploymentType {
    PREVIEW = 'preview',
    CUSTOM = 'custom',
    UNPUBLISH_PREVIEW = 'unpublish_preview',
    UNPUBLISH_CUSTOM = 'unpublish_custom',
}

export enum DeploymentStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export interface DeploymentState {
    status: DeploymentStatus;
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
