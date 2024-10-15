import React from 'react';
import wordLogo from '@/assets/word-logo.svg';
import { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const WordLogo = React.forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
    ({ className, ...props }, ref) => (
        <img
            ref={ref}
            src={wordLogo}
            alt="Onlook logo"
            className={cn(
              'w-1/4 dark:invert', 
              className,
            )}
            {...props}
        />
    ),
);
WordLogo.displayName = 'WordLogo';

export { WordLogo };
