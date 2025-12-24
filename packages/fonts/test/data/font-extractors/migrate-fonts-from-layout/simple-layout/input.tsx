import React from 'react';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-inter',
});

export const customFont = localFont({
    src: './fonts/custom.woff2',
    variable: '--font-custom',
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html className={`${inter.variable} ${customFont.variable}`}>
            <body className={inter.className}>{children}</body>
        </html>
    );
}
