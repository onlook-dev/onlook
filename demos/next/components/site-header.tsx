import Link from "next/link"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  return (
    <header
      className="bg-background sticky top-0 z-40 w-full border-b"
      data-oid="w4r8le9"
    >
      <div
        className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0"
        data-oid="mxd7olz"
      >
        <MainNav items={siteConfig.mainNav} data-oid="6xgo0i:" />
        <div
          className="flex flex-1 items-center justify-end space-x-4"
          data-oid="heel7_9"
        >
          <nav className="flex items-center space-x-1" data-oid="1wyjhyx">
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer"
              data-oid="0d9i35y"
            >
              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
                data-oid="u6fe9_j"
              >
                <Icons.gitHub className="h-5 w-5" data-oid="x8p8pw." />
                <span className="sr-only" data-oid="h2puvh9">
                  GitHub
                </span>
              </div>
            </Link>
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              data-oid="a4i1oq0"
            >
              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
                data-oid=":z8k8sx"
              >
                <Icons.twitter
                  className="h-5 w-5 fill-current"
                  data-oid="jbje74h"
                />

                <span className="sr-only" data-oid="rn1l1nj">
                  Twitter
                </span>
              </div>
            </Link>
            <ThemeToggle data-oid="jvkz2q:" />
          </nav>
        </div>
      </div>
    </header>
  )
}
