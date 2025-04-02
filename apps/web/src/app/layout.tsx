import "~/styles/globals.css";

import { TRPCReactProvider } from "@/trpc/react";
import { type Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Geist } from "next/font/google";

export const metadata: Metadata = {
    title: "Onlook",
    description: "Onlook – Cursor for Designers",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

export default async function RootLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={`${geist.variable} dark`}>
            <body>
                <TRPCReactProvider>
                    <NextIntlClientProvider>
                        {/* <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme"> */}
                        {/* <TooltipProvider> */}
                        {/* @ts-expect-error - children is a ReactNode */}
                        {children}
                        {/* <Modals /> */}
                        {/* <Toaster /> */}
                        {/* </TooltipProvider> */}
                        {/* </ThemeProvider> */}
                    </NextIntlClientProvider>
                </TRPCReactProvider>
            </body>
        </html >
    );
}
