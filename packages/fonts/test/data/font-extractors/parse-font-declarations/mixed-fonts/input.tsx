import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-inter',
});

export const customFont = localFont({
    src: [
        { path: './fonts/custom-regular.woff2', weight: '400', style: 'normal' },
        { path: './fonts/custom-bold.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-custom',
});

// This should be ignored as it's not exported
const notExported = Inter({
    subsets: ['latin'],
    weight: ['400'],
});
