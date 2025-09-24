'use client';

import { useMemo } from 'react';

import type { Project } from '@onlook/models';

export function MasonryLayout<T extends Project>({
    items,
    spacing,
    renderItem,
}: {
    items: T[];
    spacing: number;
    renderItem: (item: T, aspectRatio?: string, searchQuery?: string) => React.ReactNode;
}) {
    const aspectRatios = [
        'aspect-[4/2.5]',
        'aspect-[4/3]',
        'aspect-[4/3.5]',
        'aspect-[4/4.5]',
        'aspect-[4/2.8]',
        'aspect-[4/5]',
        'aspect-[4/2.2]',
        'aspect-[4/3.8]',
    ];

    const getAspectRatio = (item: T): string => {
        const id = item.id;
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return aspectRatios[Math.abs(hash) % aspectRatios.length] || 'aspect-[4/3]';
    };

    const getItemHeight = (aspectRatio: string): number => {
        const match = /aspect-\[4\/(\d+(?:\.\d+)?)\]/.exec(aspectRatio);
        return match?.[1] ? parseFloat(match[1]) : 3;
    };

    const columns = useMemo(() => {
        const cols: Array<{ items: Array<{ item: T; aspectRatio: string }>; totalHeight: number }> =
            [
                { items: [], totalHeight: 0 },
                { items: [], totalHeight: 0 },
                { items: [], totalHeight: 0 },
            ];

        items.forEach((item) => {
            const aspectRatio = getAspectRatio(item);
            const itemHeight = getItemHeight(aspectRatio);
            const shortestCol = cols.reduce((min, col) =>
                col.totalHeight < min.totalHeight ? col : min,
            );

            shortestCol.items.push({ item, aspectRatio });
            shortestCol.totalHeight += itemHeight;
        });

        return cols;
    }, [items]);

    return (
        <div className="flex w-full" style={{ gap: `${spacing}px` }}>
            {columns.map((column, colIndex) => (
                <div key={colIndex} className="flex flex-1 flex-col">
                    {column.items.map(({ item, aspectRatio }, itemIndex) => (
                        <div
                            key={item.id}
                            style={{
                                marginBottom:
                                    itemIndex < column.items.length - 1 ? `${spacing}px` : 0,
                            }}
                        >
                            {renderItem(item, aspectRatio)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
