export type TemplateString = DefaultTemplateString | AbsoluteTemplateString | AbsoluteString;
export type DefaultTemplateString = {
    default: string;
    template: string;
};
export type AbsoluteTemplateString = {
    absolute: string;
    template: string | null;
};
export type AbsoluteString = {
    absolute: string;
};

type OpenGraphType = 'website';

type OpenGraph = OpenGraphWebsite;

type OpenGraphMetadata = {
    title?: string;
    description?: string;
    siteName?: string;
    images?: OGImage | Array<OGImage>;
    url?: string | URL;
};

type OpenGraphWebsite = OpenGraphMetadata & {
    type: 'website';
};

type OGImage = string | OGImageDescriptor | URL;

type OGImageDescriptor = {
    url: string | URL;
    width?: number;
    height?: number;
    alt?: string;
};

type ResolvedOpenGraph = ResolvedOpenGraphWebsite;

type ResolvedOpenGraphMetadata = {
    title: string;
    description?: string;
    siteName?: string;
    images?: Array<OGImage>;
    url: string | URL;
};

type ResolvedOpenGraphWebsite = ResolvedOpenGraphMetadata & {
    type: 'website';
};

export type { OpenGraphType, OpenGraph, OGImage, ResolvedOpenGraph, ResolvedOpenGraphMetadata };
