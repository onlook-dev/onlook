import type { OGImage, OpenGraph } from './opengraph';

export type { OGImage };

export interface PageNode {
    id: string;
    path: string;
    name: string;
    metadata?: PageMetadata;
    children?: PageNode[];
    isActive: boolean;
    isRoot?: boolean;
}

export interface TitleMetadata {
    template?: string;
    default?: string;
    absolute?: string;
}

export interface PageMetadata {
    title?: string | TitleMetadata;
    description?: string;
    applicationName?: string;
    metadataBase?: null | URL;
    icons?: null | Icons;
    openGraph?: null | OpenGraph;
}

type IconURL = string | URL;
type Icon = IconURL | IconDescriptor;
type IconDescriptor = {
    url: string | URL;
    type?: string;
    sizes?: string;
    color?: string;
    /** defaults to rel="icon" unless superseded by Icons map */
    rel?: string;
    media?: string;
    /**
     * @see https://developer.mozilla.org/docs/Web/API/HTMLImageElement/fetchPriority
     */
    fetchPriority?: 'high' | 'low' | 'auto';
};
type Icons = {
    /** rel="icon" */
    icon?: Icon;
    /** rel="shortcut icon" */
    shortcut?: Icon;
    /**
     * @see https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
     * rel="apple-touch-icon"
     */
    apple?: Icon;
    /** rel inferred from descriptor, defaults to "icon" */
    other?: IconDescriptor | IconDescriptor[];
};
