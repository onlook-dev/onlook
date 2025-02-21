export enum HostingStatus {
    NO_ENV = 'no-env',
    READY = 'ready',
    DEPLOYING = 'deploying',
    ERROR = 'error',
    DELETING = 'deleting',
}

export const HostingStateMessages = {
    [HostingStatus.NO_ENV]: 'Share public link (beta)',
    [HostingStatus.READY]: 'Public link',
    [HostingStatus.DEPLOYING]: 'Deploying',
    [HostingStatus.ERROR]: 'Error',
    [HostingStatus.DELETING]: 'Deleting',
};

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
