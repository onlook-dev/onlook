import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import { PostHogProvider } from '@/components/posthog-provider';
import { FeatureFlagsProvider } from '@/hooks/use-feature-flags';
import { TRPCReactProvider } from '@/trpc/react';
import { Toaster } from '@onlook/ui/sonner';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { ThemeProvider } from './_components/theme';
import { AuthProvider } from './auth/auth-context';
import { faqSchema, organizationSchema } from './seo';

export const metadata: Metadata = {
    title: 'GeauxCode – Comprehensive Development Platform',
    description: 'Complete development toolkit with extension builder, system monitor, AI wrapper studio, security suite, database manager, project generators, and more. Build anything with our powerful platform.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
    openGraph: {
        url: 'https://geauxcode.com/',
        type: 'website',
        title: 'GeauxCode – Comprehensive Development Platform',
        description: 'Complete development toolkit with extension builder, system monitor, AI wrapper studio, security suite, database manager, project generators, and more.',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@geauxcode',
        creator: '@geauxcode',
        title: 'GeauxCode – Comprehensive Development Platform',
        description: 'Complete development toolkit with extension builder, system monitor, AI wrapper studio, security suite, database manager, project generators, and more.',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
};

import { Inter } from 'next/font/google';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();

    return (
        <html lang={locale} className="font-sans" suppressHydrationWarning>
            <head>
                <link rel="canonical" href="https://geauxcode.com/" />
                <meta name="robots" content="index, follow" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            </head>
            <body className="font-sans">
                <TRPCReactProvider>
                    <FeatureFlagsProvider>
                        <PostHogProvider>
                            <ThemeProvider
                                attribute="class"
                                forcedTheme="dark"
                                enableSystem
                                disableTransitionOnChange
                            >
                                <AuthProvider>
                                    <NextIntlClientProvider>
                                        {children}
                                        <Toaster />
                                    </NextIntlClientProvider>
                                </AuthProvider>
                            </ThemeProvider>
                        </PostHogProvider>
                    </FeatureFlagsProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
