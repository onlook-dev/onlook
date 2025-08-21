import type { SandboxTemplate } from '@onlook/models';

export enum Templates {
    BLANK = 'BLANK',
    EMPTY_NEXTJS = 'EMPTY_NEXTJS',
    SAAS_PLATFORM = 'SAAS_PLATFORM',
}

export const SandboxTemplates: Record<Templates, SandboxTemplate> = {
    BLANK: {
        id: 'xzsy8c',
        port: 3000,
    },
    EMPTY_NEXTJS: {
        id: 'vgfzfw',
        port: 3000,
    },
    SAAS_PLATFORM: {
        id: 'o5p7zi',
        port: 3000,
    },
};

export const CSB_PREVIEW_TASK_NAME = 'dev';
export const CSB_DOMAIN = 'csb.app';

export function getSandboxPreviewUrl(sandboxId: string, port: number) {
    return `https://${sandboxId}-${port}.${CSB_DOMAIN}`;
}
