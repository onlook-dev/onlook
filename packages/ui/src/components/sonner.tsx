'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps, toast } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = 'system' } = useTheme();

    return <Sonner theme={theme as ToasterProps['theme']} className="toaster group" {...props} />;
};

export { Toaster, toast };
