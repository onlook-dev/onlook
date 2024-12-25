import "@/styles/globals.css"
import { Metadata } from "next"

import { siteConfig } from "@/config/site"
import { fontSans } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning data-oid="nukosna">
        <head data-oid=":j0xzp6">
          <title data-oid="3atmyep">Onlook Demo Dashboard</title>
        </head>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable
          )}
          data-oid="8n0_z30"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            data-oid="-k2lnw-"
          >
            <div
              className="relative flex min-h-screen flex-col"
              data-oid="_x9fp34"
            >
              <div className="flex-1" data-oid="p1akak9">
                {children}
              </div>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
