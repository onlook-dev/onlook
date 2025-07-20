import Script from 'next/script';
import React, { type ReactNode } from 'react';

// Mock components
const ThemeProvider = (props: { children: ReactNode; [key: string]: any }) => <>{props.children}</>;
const Navbar = (props: any) => <header>Navbar</header>;
const Footer = (props: any) => <footer>Footer</footer>;

export default function Document() {
    return (
        <html lang="en" suppressHydrationWarning data-oid="o7v_4be">
            <head data-oid="795jc-7">
                <Script
                    type="module"
                    src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/preload/dist/index.js"
                    data-oid="m4pfglr"
                />

                <Script
                    type="module"
                    src="https://cdn.jsdelivr.net/gh/onlook-dev/web@latest/apps/web/preload/dist/index.js"
                    data-oid="yujojk-"
                />
            </head>
            <body className={'h-screen antialiased'} data-oid="lb.txaa">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                    data-oid="3tbrd3_"
                >
                    <Navbar data-oid="ctrg0y3" />
                    <main className="" data-oid="j990_9w">
                        {/* @ts-ignore */}
                        {children}
                    </main>
                    <Footer data-oid="j7nr0na" />
                </ThemeProvider>
            </body>
        </html>
    );
}
