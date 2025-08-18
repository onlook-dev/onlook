import localFont from 'next/font/local';
export const emptyFont = localFont({
  src: [{
    path: "./fonts/empty-regular.woff2",
    weight: "400",
    style: "normal"
  }],
  variable: '--font-empty',
  display: 'swap'
});