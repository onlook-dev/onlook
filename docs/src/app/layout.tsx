import './global.css';

import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import RB2BLoader from '@/components/rb2b-loader';

const geist = Geist({
    subsets: ['latin'],
    variable: '--font-geist',
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

const isProduction = process.env.NODE_ENV === 'production';

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={geist.variable} suppressHydrationWarning>
            <body className="flex flex-col min-h-screen">
                {isProduction && (
                    <>
                        <Script src="https://z.onlook.com/cdn-cgi/zaraz/i.js" strategy="lazyOnload" />
                        <RB2BLoader />
                    </>
                )}
                <RootProvider>
                    <DocsLayout tree={source.pageTree} {...docsOptions}>
                        {children}
                    </DocsLayout>
                </RootProvider>
            </body>
        </html>
    );
}

