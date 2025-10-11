import '@/styles/globals.css';
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
                {children}
            </body>
        </html>
    );
}
