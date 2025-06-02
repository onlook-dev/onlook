import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import { PostHogProvider } from '@/components/posthog-provider';
import { FeatureFlagsProvider } from '@/hooks/use-feature-flags';
import { TRPCReactProvider } from '@/trpc/react';
import { Toaster } from '@onlook/ui/sonner';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './_components/theme';
import { AuthProvider } from './auth/auth-context';

export const metadata: Metadata = {
    title: 'Onlook – Cursor for Designers',
    description: 'The power of Cursor for your own website. Onlook lets you edit your React website and write your changes back to code in real-time. Iterate and experiment with AI.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
    openGraph: {
        url: 'https://onlook.com/',
        type: 'website',
        title: 'Onlook – Cursor for Designers',
        description: 'The power of Cursor for your own website. Onlook lets you edit your React website and write your changes back to code in real-time. Iterate and experiment with AI.',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@onlookdev',
        creator: '@onlookdev',
        title: 'Onlook – Cursor for Designers',
        description: 'The power of Cursor for your own website. Onlook lets you edit your React website and write your changes back to code in real-time. Iterate and experiment with AI.',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
};

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={inter.variable} suppressHydrationWarning>
            <body>
                <FeatureFlagsProvider>
                    <PostHogProvider>
                        <ThemeProvider
                            attribute="class"
                            forcedTheme="dark"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <TRPCReactProvider>
                                <AuthProvider>
                                    <NextIntlClientProvider>
                                        {children}
                                        <Toaster />
                                    </NextIntlClientProvider>
                                </AuthProvider>
                            </TRPCReactProvider>
                        </ThemeProvider>
                    </PostHogProvider>
                </FeatureFlagsProvider>
            </body>
        </html>
    );
}
