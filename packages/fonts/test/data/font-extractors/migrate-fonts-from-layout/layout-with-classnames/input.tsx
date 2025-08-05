import React from 'react';
import { Inter } from 'next/font/google';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-inter',
});

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html className={`${inter.variable} bg-white`}>
            <body className={`${inter.className} min-h-screen text-gray-900`}>
                <div className={`container mx-auto ${inter.className}`}>
                    <header className="header-style">
                        <h1 className={inter.className}>Title</h1>
                    </header>
                    <main className={`main-content ${inter.variable} px-4`}>{children}</main>
                </div>
            </body>
        </html>
    );
}
