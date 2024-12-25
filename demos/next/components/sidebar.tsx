import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import {
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "./shared"

export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex"
      data-oid="g:ifa73"
    >
      <nav
        className="flex flex-col items-center gap-4 px-2 sm:py-5"
        data-oid="ilji4hn"
      >
        <TooltipProvider data-oid="i-5p9ka">
          <Tooltip data-oid="safibh0">
            <TooltipTrigger asChild data-oid="390izjb">
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-lg  transition-colors hover:text-foreground md:h-8 md:w-8"
                href="dashboard"
                data-oid="nmgbw6h"
              >
                <HomeIcon className="h-5 w-5" data-oid="7qfcb8j" />
                <span className="sr-only" data-oid="mmu1-hd">
                  Dashboard
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" data-oid="bme8aq5">
              Dashboard
            </TooltipContent>
          </Tooltip>
          <Tooltip data-oid="u_lusnr">
            <TooltipTrigger asChild data-oid="m_lgxc-">
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-lg  transition-colors hover:text-foreground md:h-8 md:w-8"
                href="/orders"
                data-oid="dvfmcb-"
              >
                <ShoppingCartIcon className="h-5 w-5" data-oid="i0hjn7o" />
                <span className="sr-only" data-oid="vtrls3r">
                  Orders
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" data-oid="wdmz830">
              Orders
            </TooltipContent>
          </Tooltip>
          <Tooltip data-oid="q.88esa">
            <TooltipTrigger asChild data-oid="528ik1s">
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-lg  transition-colors hover:text-foreground md:h-8 md:w-8"
                href="/products"
                data-oid="opo6g24"
              >
                <PackageIcon className="h-5 w-5" data-oid="y4y586q" />
                <span className="sr-only" data-oid="3x10f0:">
                  Products
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" data-oid="jcb2g80">
              Products
            </TooltipContent>
          </Tooltip>
          <Tooltip data-oid="f3jmtjh">
            <TooltipTrigger asChild data-oid="7gh5wog">
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-lg  transition-colors hover:text-foreground md:h-8 md:w-8"
                href="auth"
                data-oid="cikr7ur"
              >
                <UsersIcon className="h-5 w-5" data-oid="nio3c.3" />
                <span className="sr-only" data-oid="t2:5936">
                  Customers
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" data-oid="38f:ww:">
              Customers
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
      <nav
        className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5"
        data-oid="u:zds7b"
      >
        <TooltipProvider data-oid="hxmjum-">
          <Tooltip data-oid="kjy23n4">
            <TooltipTrigger asChild data-oid="w_:qs3o">
              <Link
                className="flex h-9 w-9 items-center justify-center rounded-lg  transition-colors hover:text-foreground md:h-8 md:w-8"
                href="/settings"
                data-oid="tpgn8mn"
              >
                <SettingsIcon className="h-5 w-5" data-oid=":o7kx_k" />
                <span className="sr-only" data-oid="ycct6z5">
                  Settings
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" data-oid="y82tno0">
              Settings
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>
  )
}
