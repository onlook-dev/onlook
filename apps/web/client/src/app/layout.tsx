import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import RB2BLoader from '@/components/rb2b-loader';
import { TelemetryProvider } from '@/components/telemetry-provider';
import { env } from '@/env';
import { FeatureFlagsProvider } from '@/hooks/use-feature-flags';
import { TRPCReactProvider } from '@/trpc/react';
import { Toaster } from '@onlook/ui/sonner';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from './_components/theme';
import { AuthProvider } from './auth/auth-context';
import { faqSchema, organizationSchema } from './seo';

const isProduction = env.NODE_ENV === 'production';

export const metadata: Metadata = {
    title: 'Synthia 3.0 – AI Design Auditor & Front-End Builder',
    description: 'Cynthia audits your UI like a credit bureau and rebuilds it into a lovable, conversion-ready front end. Get your design score, fix issues, and ship to GitHub.',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
    openGraph: {
        url: 'https://onlook.com/',
        type: 'website',
        siteName: 'Synthia 3.0',
        title: 'Synthia 3.0 – Stop Shipping Ugly',
        description: 'Cynthia audits your UI like a credit bureau—and rebuilds it into a lovable, conversion-ready front end. No signup to start.',
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
        title: 'Synthia 3.0 – Stop Shipping Ugly',
        description: 'Cynthia audits your UI like a credit bureau—and rebuilds it into a lovable, conversion-ready front end. Get your design score instantly.',
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
            <head>
                <link rel="canonical" href="https://onlook.com/" />
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
            <body>
                {isProduction && (
                    <>
                        <Script src="https://z.onlook.com/cdn-cgi/zaraz/i.js" strategy="lazyOnload" />
                        <RB2BLoader />
                    </>
                )}
                <TRPCReactProvider>
                    <FeatureFlagsProvider>
                        <TelemetryProvider>
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
                        </TelemetryProvider>
                    </FeatureFlagsProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
