import { type DomainInfo, DomainType } from '@onlook/models';
import type { PreviewDomain, ProjectCustomDomain } from '../schema';

export const toDomainInfoFromPreview = (previewDomain: PreviewDomain): DomainInfo => {
    return {
        url: previewDomain.fullDomain,
        type: DomainType.PREVIEW,
        publishedAt: previewDomain.updatedAt.toISOString(),
    };
};

export const toDomainInfoFromPublished = (projectCustomDomain: ProjectCustomDomain): DomainInfo => {
    return {
        url: projectCustomDomain.fullDomain,
        type: DomainType.CUSTOM,
        publishedAt: projectCustomDomain.updatedAt.toISOString(),
    };
};
