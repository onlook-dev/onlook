import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import { PostHogProvider } from '@/components/posthog-provider';
import { TRPCReactProvider } from '@/trpc/react';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './_components/theme';
import { AuthProvider } from './auth/auth-context';
import { FeatureFlagsProvider } from '@/hooks/use-feature-flags';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Cursor for Designers',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
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
                            defaultTheme="dark"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <TRPCReactProvider>
                                <AuthProvider>
                                    <NextIntlClientProvider>{children}</NextIntlClientProvider>
                                </AuthProvider>
                            </TRPCReactProvider>
                        </ThemeProvider>
                    </PostHogProvider>
                </FeatureFlagsProvider>
            </body>
        </html>
    );
}
