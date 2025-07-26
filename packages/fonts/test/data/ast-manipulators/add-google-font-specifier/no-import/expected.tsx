import localFont from 'next/font/local';
import { Inter } from "next/font/google";
export const customFont = localFont({
  src: './fonts/custom.woff2',
  variable: '--font-custom',
  display: 'swap'
});