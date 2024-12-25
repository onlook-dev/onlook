"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      data-oid="j26s9by"
    >
      <Sun className="h-[1.5rem] w-[1.3rem] dark:hidden" data-oid="k4qktdx" />
      <Moon className="hidden h-5 w-5 dark:block" data-oid="h-llf9v" />
      <span className="sr-only" data-oid="qaq273p">
        Toggle theme
      </span>
    </Button>
  )
}
