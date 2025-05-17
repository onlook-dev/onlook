'use client';

import Link from 'next/link';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { useTheme } from 'next-themes';

export function TopBar() {
  const { theme, setTheme } = useTheme();
  
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
            aria-label="Search documentation"
          >
            <svg
              className="mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>Search...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">{navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'}</span>K
            </kbd>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="https://github.com/onlook-dev/onlook" target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span className="sr-only">GitHub</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
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
