import Link from "next/link"

import Logo from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

export default function Home() {
  return (
    <main className="flex flex-col gap-[32px] h-screen items-center justify-center overflow-auto m-10">
      <div className="container max-w-[64rem] flex-col items-center gap-4 text-center grid">
        <Logo width={80} height={80} />
        <h1 className="text-2xl font-semibold sm:text-5xl md:text-6xl lg:text-7xl bg-[#05001f] text-[#dadde2]">
          {siteConfig.name}
        </h1>
        <p className="max-w-[42rem] leading-normal text-muted-foreground text-xl">
          {siteConfig.description}
        </p>
        <div className="flex gap-2">
          <Link
            href={siteConfig.links.quickstart}
            className={cn(buttonVariants({ size: "default" }))}>

            Get Started
          </Link>
          <ModeToggle />
        </div>
      </div>
      <div className="w-full max-w-lg  flex flex-col gap-3">
        <p className="m-0 p-0 text-left text-lg">What is Onlook?</p>
        <p className="m-0 p-0 text-left flex">Onlook is a browser extension that lets anyone edit any webpage, then publish their edits to a codebase without writing any code themselves. Designers can build directly on the website itself, and Developers can focus on building more than User Interfaces.</p>
      </div>
      <div className="w-full h-px"></div>
      <div className="w-full max-w-lg flex flex-col gap-3">
        <p className="m-0 p-0 text-left text-2xl">Quickstart</p>
        <p className="m-0 p-0 text-left ">1. Download the extension</p>
        <p className="m-0 p-0 text-left ">2. Start a new project by inputting any url, or using our Demo Project.</p>
        <p className="m-0 p-0 text-left ">3. Use the Layers Panel and Styles Panel to select layers and change them. Or you add your elements to the page.</p>
        <p className="m-0 p-0 text-left " contentEditable spellCheck="true">4. Share your project with colleagues using the "Share" button in the upper right corner, or review your edits in the Onlook Dashboard.</p>
      </div>
    </main>
  )
}
