export enum DomainType {
    BASE = 'base',
    CUSTOM = 'custom',
}

export interface ProjectDomain {
    base: DomainSettings | null;
    custom: DomainSettings | null;
}

export interface DomainSettings {
    url: string;
    type: DomainType;
    publishedAt?: string;
}
