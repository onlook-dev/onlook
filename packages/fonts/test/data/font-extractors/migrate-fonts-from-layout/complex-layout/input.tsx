import React from 'react';
import { Inter, Roboto } from 'next/font/google';
import localFont from 'next/font/local';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal'],
    variable: '--font-inter',
});

export const roboto = Roboto({
    subsets: ['latin'],
    weight: ['300', '400'],
    variable: '--font-roboto',
});

export const brandFont = localFont({
    src: [
        { path: './fonts/brand-regular.woff2', weight: '400', style: 'normal' },
        { path: './fonts/brand-bold.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-brand',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${inter.variable} ${roboto.variable} ${brandFont.variable}`}>
            <head>
                <title>My App</title>
            </head>
            <body className={`${inter.className} antialiased`}>
                <main className={roboto.className}>
                    <header className={brandFont.className}>
                        <h1>Welcome</h1>
                    </header>
                    {children}
                </main>
            </body>
        </html>
    );
}
