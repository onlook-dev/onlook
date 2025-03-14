interface UpdateResult {
    success: boolean;
    error?: string;
}

interface ColorUpdate {
    configPath: string;
    cssPath: string;
    configContent: string;
    cssContent: string;
}

interface ConfigUpdateResult {
    keyUpdated: boolean;
    valueUpdated: boolean;
    output: string;
}

interface ClassReplacement {
    oldClass: string;
    newClass: string;
}

interface ThemeColors {
    [key: string]: string;
}

interface ColorValue {
    name: string;
    lightMode: string;
    darkMode: string;
}

interface ParsedColors {
    [key: string]: ColorValue;
}

interface ConfigResult {
    cssContent: string;
    cssPath: string;
    configPath: string;
    configContent: any;
}

export enum Theme {
    LIGHT = 'light',
    DARK = 'dark',
}

export type {
    ClassReplacement,
    ColorUpdate,
    ColorValue,
    ConfigResult,
    ConfigUpdateResult,
    ParsedColors,
    ThemeColors,
    UpdateResult,
};
