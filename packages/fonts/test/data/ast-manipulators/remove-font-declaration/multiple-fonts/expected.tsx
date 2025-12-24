import { Inter, Poppins } from 'next/font/google';
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
  variable: '--font-inter',
  display: 'swap'
});
export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal'],
  variable: '--font-poppins',
  display: 'swap'
});