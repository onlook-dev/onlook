import { SiteConfig } from "@/types"

const NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

export const siteConfig: SiteConfig = {
  name: "Onlook Docs",
  author: "onlook.dev",
  description:
    "The documentation for the first developer tool for designers",
  keywords: ["onlook", "documentation", "designer", "developer"],
  url: {
    base: NEXT_PUBLIC_APP_URL,
    author: "https://onlook.dev",
  },
  links: {
    quickstart: "/quickstart",
  },
  ogImage: `${NEXT_PUBLIC_APP_URL}/og.jpg`,
}
