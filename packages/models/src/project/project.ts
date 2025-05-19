import type { DomainSettings } from 'src/project/domain';
import type { PageMetadata } from 'src/pages';

export interface Project {
    id: string;
    name: string;
    url: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: string | null;
        description: string | null;
    };
    sandbox: {
        id: string;
        url: string;
    };
    siteMetadata: PageMetadata;
    domains: {
        base: DomainSettings | null;
        custom: DomainSettings | null;
    } | null;
    env?: Record<string, string>;
}
