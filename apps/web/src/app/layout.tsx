import "@/styles/globals.css";
import '@onlook/ui-v4/globals.css';

import { TRPCReactProvider } from "@/trpc/react";
import { TooltipProvider } from "@onlook/ui-v4/tooltip";
import { type Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "./_components/theme";

export const metadata: Metadata = {
    title: "Onlook",
    description: "Onlook – Cursor for Designers",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default async function RootLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={`${inter.variable}`}>
            <body>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">

                    <TRPCReactProvider>
                        <NextIntlClientProvider>
                            <TooltipProvider>
                                {/* @ts-expect-error - Children is ReactNode */}
                                {children}
                                {/* <Modals /> */}
                                {/* <Toaster /> */}
                            </TooltipProvider>
                        </NextIntlClientProvider>
                    </TRPCReactProvider>
                </ThemeProvider>

            </body>
        </html >
    );
}
