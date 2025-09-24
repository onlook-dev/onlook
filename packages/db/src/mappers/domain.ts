import  { type DomainInfo } from '@onlook/models';
import { DomainType } from '@onlook/models';

import { type PreviewDomain, type ProjectCustomDomain } from '../schema';

export const toDomainInfoFromPreview = (previewDomain: PreviewDomain): DomainInfo => {
    return {
        url: previewDomain.fullDomain,
        type: DomainType.PREVIEW,
        publishedAt: previewDomain.updatedAt,
    };
};

export const toDomainInfoFromPublished = (projectCustomDomain: ProjectCustomDomain): DomainInfo => {
    return {
        url: projectCustomDomain.fullDomain,
        type: DomainType.CUSTOM,
        publishedAt: projectCustomDomain.updatedAt,
    };
};
