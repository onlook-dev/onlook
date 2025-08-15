'use client';

import type { Project } from '@onlook/models';

export function MasonryLayout<T extends Project>({ items, spacing, renderItem }: {
    items: T[];
    spacing: number;
    renderItem: (item: T, aspectRatio?: string, searchQuery?: string) => React.ReactNode;
}) {
    const aspectRatios = [
        "aspect-[4/2.5]", "aspect-[4/3]", "aspect-[4/3.5]", "aspect-[4/4.5]",
        "aspect-[4/2.8]", "aspect-[4/5]", "aspect-[4/2.2]", "aspect-[4/3.8]",
    ];

    const getAspectRatio = (item: T) => {
        const id = item.id;
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return aspectRatios[Math.abs(hash) % aspectRatios.length];
    };

    return (
        <div className="w-full" style={{ columnCount: 3, columnGap: `${spacing}px` }}>
            {items.map((item) => (
                <div key={item.id} style={{ breakInside: "avoid", marginBottom: `${spacing}px` }}>
                    {renderItem(item, getAspectRatio(item))}
                </div>
            ))}
        </div>
    );
}
