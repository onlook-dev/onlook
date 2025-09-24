'use client';

import type { ToasterProps } from 'sonner';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = 'system' } = useTheme();

    return (
        <Sonner
            position="bottom-left"
            theme={theme as ToasterProps['theme']}
            className="toaster group"
            {...props}
        />
    );
};

export { Toaster, toast };
