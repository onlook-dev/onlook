import type { SandboxTemplate } from '@onlook/models';

export enum Templates {
    BLANK = 'BLANK',
    EMPTY_NEXTJS = 'EMPTY_NEXTJS',
}

export const E2BTemplates: Record<Templates, SandboxTemplate> = {
    BLANK: {
        id: 'nodejs',
        port: 3000,
    },
    EMPTY_NEXTJS: {
        id: 'nextjs-app',
        port: 3000,
    },
};

export const E2B_PREVIEW_TASK_NAME = 'dev';
export const E2B_DOMAIN = 'e2b.dev';

export function getSandboxPreviewUrl(sandboxId: string, port: number) {
    // E2B uses a different URL structure
    return `https://${sandboxId}-${port}.e2b.dev`;
}

// E2B specific configurations
export const E2B_DEFAULT_TIMEOUT = 300000; // 5 minutes in ms