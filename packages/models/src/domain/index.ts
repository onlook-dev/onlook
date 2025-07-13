export enum DomainType {
    PREVIEW = 'preview',
    CUSTOM = 'custom',
}

export enum VerificationRequestStatus {
    PENDING = 'pending',
    VERIFIED = 'verified',
    CANCELLED = 'cancelled',
}

export interface DomainInfo {
    url: string;
    type: DomainType;
    publishedAt?: string;
}

interface BaseVerificationRecord {
    type: 'TXT' | 'A';
    name: string;
    value: string;
    verified: boolean;
}

export interface TxtVerificationRecord extends BaseVerificationRecord {
    type: 'TXT';
}

export interface AVerificationRecord extends BaseVerificationRecord {
    type: 'A';
}

export type VerificationRecord = TxtVerificationRecord | AVerificationRecord;
