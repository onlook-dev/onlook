// Global styles
import '@onlook/ui/globals.css';
import './global.css';

import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata = {
    metadataBase: new URL('https://docs.onlook.dev'),
    title: {
        default: 'Onlook Docs',
        template: '%s – Onlook Docs',
    },
    description:
        'Official documentation for Onlook – an open-source "Cursor for Designers" that lets you visually edit React & Tailwind projects.',
    openGraph: {
        siteName: 'Onlook Docs',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        site: '@onlookdev',
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: '/',
    },
};

const docsOptions = {
    ...baseOptions,
};

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <body className="flex flex-col min-h-screen">
                <RootProvider>
                    <DocsLayout tree={source.pageTree} {...docsOptions}>
                        {children}
                    </DocsLayout>
                </RootProvider>
            </body>
        </html>
    );
}

