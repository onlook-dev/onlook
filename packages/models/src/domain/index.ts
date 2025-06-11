export enum DomainType {
    PREVIEW = 'preview',
    CUSTOM = 'custom',
}

export enum VerificationRequestStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    USED = 'used',
}

export interface DomainInfo {
    url: string;
    type: DomainType;
    publishedAt?: string;
}
