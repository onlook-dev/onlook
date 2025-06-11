import { type DomainInfo, DomainType } from '@onlook/models';
import type { PreviewDomain, PublishedDomain } from '../schema';

export const toDomainInfoFromPreview = (previewDomain: PreviewDomain): DomainInfo => {
    return {
        url: previewDomain.fullDomain,
        type: DomainType.PREVIEW,
        publishedAt: previewDomain.updatedAt.toISOString(),
    };
};

export const toDomainInfoFromPublished = (publishedDomain: PublishedDomain): DomainInfo => {
    return {
        url: publishedDomain.fullDomain,
        type: DomainType.CUSTOM,
        publishedAt: publishedDomain.updatedAt.toISOString(),
    };
};
