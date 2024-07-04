import { SiteConfig } from "@/types"
import { env } from "@/env.mjs"

export const siteConfig: SiteConfig = {
  name: "Onlook Docs",
  author: "onlook.dev",
  description:
    "The documentation for the first developer tool for designers",
  keywords: ["onlook", "documentation", "designer", "developer"],
  url: {
    base: env.NEXT_PUBLIC_APP_URL,
    author: "https://onlook.dev",
  },
  links: {
    quickstart: "/quickstart",
  },
  ogImage: `${env.NEXT_PUBLIC_APP_URL}/og.jpg`,
}
