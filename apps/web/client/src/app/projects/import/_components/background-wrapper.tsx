'use client';

import { useGetBackground } from '@/hooks/use-get-background';

export function BackgroundWrapper({ children }: { children: React.ReactNode }) {
    const backgroundUrl = useGetBackground('create');

    return (
        <div
            className="fixed inset-0"
            style={{
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: `url(${backgroundUrl})`,
            }}
        >
            {children}
        </div>
    );
}
