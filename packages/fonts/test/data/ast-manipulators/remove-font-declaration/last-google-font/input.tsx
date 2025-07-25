import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal'],
    variable: '--font-inter',
    display: 'swap',
});

export const customFont = localFont({
    src: './fonts/custom.woff2',
    variable: '--font-custom',
    display: 'swap',
});
