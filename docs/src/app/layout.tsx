import '@onlook/ui/globals.css';
import './global.css';

import { RootProvider } from 'fumadocs-ui/provider';
import { type Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { TopBar } from '@/components/top-bar';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook Documentation',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <body className="flex flex-col min-h-screen">
                <TopBar />
                <RootProvider search={{}}>{children}</RootProvider>
            </body>
        </html>
    );
}
