'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps, toast } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = 'system' } = useTheme();

    return (
        <Sonner
            theme={theme as ToasterProps['theme']}
            className="toaster group"
            style={
                {
                    '--normal-bg': 'hsl(var(--card))',
                    '--normal-text': 'hsl(var(--card-foreground))',
                    '--normal-border': 'hsl(var(--border))',
                } as React.CSSProperties
            }
            {...props}
        />
    );
};

export { Toaster, toast };
