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
            <head>
                <link rel="canonical" href="https://onlook.com/" />
                <meta name="robots" content="index, follow" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  "name": "Onlook",
                  "url": "https://onlook.com/",
                  "logo": "https://onlook.com/favicon.ico",
                  "sameAs": [
                    "https://github.com/onlook-dev/onlook",
                    "https://twitter.com/onlookdev",
                    "https://www.linkedin.com/company/onlook-dev/"
                  ]
                }` }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "What kinds of things can I design with Onlook?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "You can prototype, ideate, and create websites from scratch with Onlook"
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Why would I use Onlook?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "When you design in Onlook you design in the real product – in other words, the source of truth. Other products are great for ideating, but Onlook is the only one that lets you design with the existing product and the only one that translates your designs to code instantly."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Who owns the code that I write with Onlook?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "The code you make with Onlook is all yours. Your code is written locally directly to your files, and isn't hosted off your device."
                      }
                    }
                  ]
                }` }} />
            </head>
            <body>
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
