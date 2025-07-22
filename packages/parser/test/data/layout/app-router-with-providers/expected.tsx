import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';import Script from "next/script";

const queryClient = new QueryClient();

export default function RootLayout({
  children


}: {children: React.ReactNode;}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>

            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
            </div>
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      
        <Script src="onlook-preload-script.js" strategy="beforeInteractive" type="module" id="onlook-preload-script.js"></Script>
      </body>
    </html>);}