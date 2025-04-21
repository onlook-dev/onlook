export enum DomainType {
    BASE = 'base',
    CUSTOM = 'custom',
}

export interface DomainSettings {
    url: string;
    type: DomainType;
    publishedAt?: string;
}
