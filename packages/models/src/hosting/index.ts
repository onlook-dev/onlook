export enum PublishStatus {
    UNPUBLISHED = 'unpublished',
    LOADING = 'loading',
    PUBLISHED = 'published',
    ERROR = 'error',
}

export interface PublishState {
    status: PublishStatus;
    message: string | null;
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

export interface PublishRequest {
    folderPath: string;
    buildScript: string;
    urls: string[];
    options?: PublishOptions;
}

export interface PublishOptions {
    skipBuild?: boolean;
    skipBadge?: boolean;
    buildFlags?: string;
    envVars?: Record<string, string>;
}

export interface UnpublishRequest {
    urls: string[];
}

export interface PublishResponse {
    success: boolean;
    message?: string;
}

export interface GetOwnedDomainsResponse {
    success: boolean;
    message?: string;
    domains?: string[];
}
