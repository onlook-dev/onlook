import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
    nav: {
        title: (
            <>
                Onlook Docs
            </>
        ),
    },
    links: [
        {
            type: 'main',
            text: 'Documentation',
            url: '/docs',
        },
        {
            type: 'main',
            text: 'GitHub',
            url: 'https://github.com/onlook-dev/onlook',
            external: true,
        },
        {
            type: 'main',
            text: 'Discord',
            url: 'https://discord.gg/hERDfFZCsH',
            external: true,
        }
    ]
};
