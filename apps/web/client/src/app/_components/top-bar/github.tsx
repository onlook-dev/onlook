'use client';

import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DEFAULT_STAR_COUNT = '19.5k';

const formatStarCount = (count: number): string => {
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`.replace('.0k', 'k');
    }
    return count.toString();
};

export function GitHubButton() {
    const [starCount, setStarCount] = useState<string>(DEFAULT_STAR_COUNT);

    useEffect(() => {
        const fetchStarCount = async () => {
            try {
                const response = await fetch('https://api.github.com/repos/onlook-dev/onlook');
                const data = await response.json();
                setStarCount(formatStarCount(data.stargazers_count));
            } catch (error) {
                console.error('Failed to fetch star count:', error);
                setStarCount(DEFAULT_STAR_COUNT);
            }
        };

        fetchStarCount();
    }, []);

    return (
        <Link href="https://github.com/onlook-dev/onlook" className="flex items-center gap-1.5 text-small hover:opacity-80">
            <Icons.GitHubLogo className="h-5 w-5" />
            <span className="transition-all duration-300">{starCount}</span>
        </Link>
    );
}
