import localFont from 'next/font/local';

export const customFont = localFont({
    src: [
        { path: './fonts/custom-regular.woff2', weight: '400', style: 'normal' },
        { path: './fonts/custom-bold.woff2', weight: '700', style: 'normal' },
        { path: './fonts/custom-italic.woff2', weight: '400', style: 'italic' },
    ],
    variable: '--font-custom',
    display: 'swap',
});

export const anotherFont = localFont({
    src: './fonts/another.woff2',
    variable: '--font-another',
    display: 'swap',
});

export const brandFont = localFont({
    src: [
        { path: './fonts/brand-light.woff2', weight: '300', style: 'normal' },
        { path: './fonts/brand-regular.woff2', weight: '400', style: 'normal' },
    ],
    variable: '--font-brand',
});
