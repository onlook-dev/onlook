// W3C design tokens https://design-tokens.github.io/community-group/format

export interface ColorToken {
    $value: string;
    $type: 'color';
}

export type DesignToken = ColorToken;

export interface DesignTokens {
    [key: string]: DesignToken | DesignTokens;
}
