import { Inter, Roboto, Open_Sans } from 'next/font/google';

export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal'],
    variable: '--font-inter',
    display: 'swap',
});

export const roboto = Roboto({
    subsets: ['latin', 'latin-ext'],
    weight: ['300', '400', '500', '700'],
    style: ['normal', 'italic'],
    variable: '--font-roboto',
    display: 'swap',
});

export const openSans = Open_Sans({
    subsets: ['latin'],
    weight: ['400', '600'],
    variable: '--font-open-sans',
});
