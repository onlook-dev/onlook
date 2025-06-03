import type { DomainSettings } from './domain';

export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: PreviewImg | null;
        description: string | null;
    };
    sandbox: {
        id: string;
        url: string;
    };
    domains: {
        base: DomainSettings | null;
        custom: DomainSettings | null;
    } | null;
    commands: ProjectCommands | null;
}

export interface ProjectCommands {
    build?: string;
    run?: string;
    install?: string;
}

export interface PreviewImg {
    type: 'storage' | 'url';
    storagePath?: {
        bucket: string;
        path: string;
    };
    url?: string;
}
