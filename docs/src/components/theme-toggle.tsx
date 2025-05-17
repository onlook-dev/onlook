'use client';

import { useTheme } from 'next-themes';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Icons.Moon className="h-4 w-4" />
      ) : (
        <Icons.Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
