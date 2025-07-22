import { Inter } from 'next/font/google';import Script from "next/script";

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children


}: {children: React.ReactNode;}) {
  const isDarkMode = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" className={isDarkMode ? 'dark' : 'light'}>
      <body className={inter.className}>
        {isDarkMode &&
        <div className="dev-banner">
            Development Mode
          </div>
        }
        <main>{children}</main>
        {process.env.NODE_ENV === 'production' &&
        <footer>© 2024 My App</footer>
        }
      
        <Script src="onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>
      </body>
    </html>);}