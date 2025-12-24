// Common types for platform extensions
export interface PlatformExtensionConfig {
    enabled: boolean;
    settings?: Record<string, unknown>;
}

export interface ExternalIntegration {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    lastSync?: Date;
}

export interface ImportResult {
    success: boolean;
    message: string;
    data?: unknown;
    errors?: string[];
}

export interface CodeGeneration {
    framework: FrameworkType;
    styleSystem: StyleSystemType;
    code: string;
    imports: string[];
}

export type FrameworkType = 'react' | 'vue' | 'angular' | 'vanilla' | 'next' | 'nuxt';
export type StyleSystemType = 'tailwind' | 'css-modules' | 'styled-components' | 'emotion' | 'vanilla-css';
export type AssetType = 'image' | 'icon' | 'media' | 'document';
export type CommentStatus = 'open' | 'resolved' | 'closed';