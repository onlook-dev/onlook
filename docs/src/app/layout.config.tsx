import { Icons } from '@onlook/ui/icons';
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
            <div className="flex items-center gap-2">
                <Icons.OnlookLogo className="w-4 h-4" />
                <span >Onlook Docs</span>
            </div>
        ),
    },
    links: [
        {
            type: 'main',
            text: 'GitHub',
            url: 'https://github.com/onlook-dev/onlook',
            external: true,
            icon: <Icons.GitHubLogo className="w-4 h-4" />
        },
        {
            type: 'main',
            text: 'Discord',
            url: 'https://discord.gg/hERDfFZCsH',
            external: true,
            icon: <Icons.DiscordLogo className="w-4 h-4" />
        }
    ]
};
