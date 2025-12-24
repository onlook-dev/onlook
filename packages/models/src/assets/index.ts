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
    [key: string]: {
        value: string;
        line?: number;
    };
}

interface ColorValue {
    name: string;
    lightMode: string;
    darkMode: string;
    line?: {
        config?: number;
        css?: {
            lightMode?: number;
            darkMode?: number;
        };
    };
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

interface Font {
    id: string;
    family: string;
    subsets: string[];
    variable: string;
    weight?: string[];
    styles?: string[];
    type: string;
}

export enum SystemTheme {
    LIGHT = 'light',
    DARK = 'dark',
    SYSTEM = 'system',
}

export type {
    ClassReplacement,
    ColorUpdate,
    ColorValue,
    ConfigResult,
    ConfigUpdateResult,
    Font,
    ParsedColors,
    ThemeColors,
    UpdateResult,
};
