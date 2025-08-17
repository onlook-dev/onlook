import localFont from 'next/font/local';
export const customFont = localFont({
  src: [{
    path: './fonts/custom-regular.woff2',
    weight: '400',
    style: 'normal'
  }, {
    path: './fonts/custom-bold.woff2',
    weight: '700',
    style: 'normal'
  }, {
    path: "./fonts/custom-black.woff2",
    weight: "900",
    style: "normal"
  }, {
    path: "./fonts/custom-light.woff2",
    weight: "300",
    style: "normal"
  }],
  variable: '--font-custom',
  display: 'swap'
});
export const anotherFont = localFont({
  src: './fonts/another.woff2',
  variable: '--font-another'
});