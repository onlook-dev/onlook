'use client';

import Link from 'next/link';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export function TopBar() {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <Icons.OnlookLogo className="h-6 w-6" />
            <span className="font-semibold">onlook</span>
          </Link>
          <div className="rounded-md bg-primary-foreground px-2 py-1 text-xs font-medium text-primary">
            DOCS
          </div>
        </div>
        
        <div className="hidden md:block">
          <Button
            variant="outline"
            className="w-64 justify-start text-sm text-muted-foreground"
            onClick={() => {
              const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform);
              const key = new KeyboardEvent('keydown', {
                key: 'k',
                code: 'KeyK',
                ctrlKey: !isMac,
                metaKey: isMac,
                bubbles: true
              });
              document.dispatchEvent(key);
            }}
          >
            <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">{navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'}</span>K
            </kbd>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="https://github.com/onlook-dev/onlook" target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Icons.GitHubLogo className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
              document.documentElement.classList.toggle('dark');
              localStorage.setItem('theme', theme);
            }}
            aria-label="Toggle theme"
          >
            {typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? (
              <Icons.Moon className="h-4 w-4" />
            ) : (
              <Icons.Sun className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <nav className="border-b border-border bg-background">
        <div className="container flex items-center">
          <Link href="/docs" className="flex h-10 items-center px-4 font-medium transition-colors hover:text-foreground text-foreground">
            Docs
          </Link>
          <Link href="/coming-soon" className="flex h-10 items-center px-4 font-medium transition-colors hover:text-foreground text-muted-foreground">
            Examples
          </Link>
          <Link href="/coming-soon" className="flex h-10 items-center px-4 font-medium transition-colors hover:text-foreground text-muted-foreground">
            Guides
          </Link>
          <Link href="/coming-soon" className="flex h-10 items-center px-4 font-medium transition-colors hover:text-foreground text-muted-foreground">
            API Reference
          </Link>
        </div>
      </nav>
    </div>
  );
}
