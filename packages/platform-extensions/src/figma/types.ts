export interface FigmaAuth {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export interface FigmaImportResult {
    fileId: string;
    components: FigmaComponent[];
    assets: FigmaAsset[];
    designTokens: DesignToken[];
}

export interface FigmaComponent {
    id: string;
    name: string;
    type: string;
    properties: ComponentProperty[];
    styles: StyleDefinition[];
    children: FigmaComponent[];
}

export interface FigmaAsset {
    id: string;
    name: string;
    type: string;
    url: string;
    format: string;
    size: number;
}

export interface DesignToken {
    name: string;
    value: string;
    type: 'color' | 'spacing' | 'typography' | 'shadow';
}

export interface ComponentProperty {
    name: string;
    type: string;
    value: unknown;
}

export interface StyleDefinition {
    property: string;
    value: string;
}