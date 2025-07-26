import localFont from 'next/font/local';
export const customFont = localFont({
  src: './fonts/custom.woff2',
  variable: '--font-custom',
  display: 'swap'
});