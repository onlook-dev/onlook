import '@/styles/globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { TRPCReactProvider } from '@/trpc/react';
import { type Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Onlook Admin',
    description: 'Admin dashboard for Onlook',
    icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <TRPCReactProvider>
                    <div className="flex h-screen overflow-hidden">
                        <Sidebar />
                        <main className="flex-1 overflow-y-auto">
                            {children}
                        </main>
                    </div>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
