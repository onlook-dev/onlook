import Logo from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import "@/styles/globals.css"
import { Search } from "lucide-react"
import Link from "next/link"

export default function Header() {
    return <header className="sticky top-0 z-50 flex w-full items-center border-b bg-white px-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
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
}
