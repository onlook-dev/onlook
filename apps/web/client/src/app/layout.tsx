import '@/styles/globals.css';
import '@onlook/ui/globals.css';

import { TRPCReactProvider } from '@/trpc/react';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './_components/theme';

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
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Vujahday+Script&display=swap" rel="stylesheet" />
            </head>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TRPCReactProvider>
                        <NextIntlClientProvider>{children}</NextIntlClientProvider>
                    </TRPCReactProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
