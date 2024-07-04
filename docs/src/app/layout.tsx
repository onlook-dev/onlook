import "@/styles/globals.css"
import Link from "next/link"
import Logo from "@/components/logo"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Inter } from "next/font/google"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata, Viewport } from "next"

const inter = Inter({ subsets: ["latin"] })

interface RootLayoutProps {
  children: React.ReactNode
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url.base),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    {
      name: siteConfig.author,
      url: siteConfig.url.author,
    },
  ],
  creator: siteConfig.author,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url.base,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@_rdev7",
  },
  icons: {
    icon: "/icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head >
        <link rel="icon" href="/logo.ico" sizes="any" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          inter.className
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >   <header className="sticky top-0 z-50 flex w-full items-center border-b bg-white px-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <Link className="flex items-center gap-4" href="#">
              <Logo width={25} height={25} />
              <span className="text-lg font-semibold">Onlook Docs</span>
            </Link>
            <nav className="h-12 ml-auto flex items-center gap-4">
              <ModeToggle />
              <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                Docs
              </Link>
              <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                Blog
              </Link>
              <Link className="text-sm font-medium hover:underline underline-offset-4" href="#">
                Community
              </Link>
              <div className="relative">
                <Input
                  className="h-8 w-48 rounded-md border border-gray-200 bg-gray-100 px-3 text-sm focus:border-gray-300 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50"
                  placeholder="Search docs..."
                  type="search"
                />
                <Search className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              </div>
            </nav>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
