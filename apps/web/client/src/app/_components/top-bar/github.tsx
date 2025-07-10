'use client';

import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DEFAULT_STAR_COUNT = 20550;
const DEFAULT_CONTRIBUTORS_COUNT = 90;

const formatStarCount = (count: number): string => {
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k`.replace('.0k', 'k');
    }
    return count.toString();
};

export function useGitHubStats() {
    const [raw, setRaw] = useState<number | null>(DEFAULT_STAR_COUNT);
    const [formatted, setFormatted] = useState<string>(formatStarCount(DEFAULT_STAR_COUNT));
    const [contributors, setContributors] = useState<number>(DEFAULT_CONTRIBUTORS_COUNT);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Stars
                const repoResponse = await fetch('https://api.github.com/repos/onlook-dev/onlook');
                const repoData = await repoResponse.json();
                setRaw(repoData.stargazers_count);
                setFormatted(formatStarCount(repoData.stargazers_count));

                // Contributors (use the Link header for pagination)
                const contribResponse = await fetch('https://api.github.com/repos/onlook-dev/onlook/contributors?per_page=1&anon=true');
                const linkHeader = contribResponse.headers.get('Link');
                if (linkHeader) {
                    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
                    if (match) {
                        setContributors(Number(match[1]));
                    }
                } else {
                    // fallback: count the single returned contributor
                    const contribData = await contribResponse.json();
                    setContributors(Array.isArray(contribData) ? contribData.length : DEFAULT_CONTRIBUTORS_COUNT);
                }
            } catch (error) {
                console.error('Failed to fetch GitHub stats:', error);
                setRaw(DEFAULT_STAR_COUNT);
                setFormatted(formatStarCount(DEFAULT_STAR_COUNT));
                setContributors(DEFAULT_CONTRIBUTORS_COUNT);
            }
        };
        fetchStats();
    }, []);

    return { raw, formatted, contributors };
}

export function GitHubButton() {
    const { formatted } = useGitHubStats();
    return (
        <a href="https://github.com/onlook-dev/onlook" className="flex items-center gap-1.5 text-small hover:opacity-80" target="_blank" rel="noopener noreferrer">
            <Icons.GitHubLogo className="h-5 w-5" />
            <span className="transition-all duration-300">{formatted}</span>
        </a>
    );
}
