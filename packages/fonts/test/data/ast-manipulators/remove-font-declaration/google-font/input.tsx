import { Inter, Roboto } from 'next/font/google';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal'],
    variable: '--font-inter',
    display: 'swap',
});

export const roboto = Roboto({
    subsets: ['latin'],
    weight: ['300', '400'],
    style: ['normal'],
    variable: '--font-roboto',
    display: 'swap',
});
