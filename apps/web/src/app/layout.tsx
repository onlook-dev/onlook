import "~/styles/globals.css";

import { TRPCReactProvider } from "@/trpc/react";
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
                <TRPCReactProvider>
                    <NextIntlClientProvider>
                        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                            {/* <TooltipProvider> */}
                            {children}
                            {/* <Modals /> */}
                            {/* <Toaster /> */}
                            {/* </TooltipProvider> */}
                        </ThemeProvider>
                    </NextIntlClientProvider>
                </TRPCReactProvider>
            </body>
        </html >
    );
}
