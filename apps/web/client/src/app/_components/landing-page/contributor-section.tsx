'use client';

import './contributor.css';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Icons } from '@onlook/ui/icons';

interface Contributor {
    login: string;
    avatar_url: string;
    id: number;
}

// Floating Circles: two concentric rings
const FloatingRings = () => {
    const [isMd, setIsMd] = useState(false);
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const media = window.matchMedia('(min-width: 768px)');
        const listener = () => setIsMd(media.matches);
        media.addEventListener('change', listener);
        setIsMd(media.matches);
        return () => media.removeEventListener('change', listener);
    }, []);

    useEffect(() => {
        const fetchContributors = async () => {
            try {
                const response = await fetch(
                    'https://api.github.com/repos/onlook-dev/onlook/contributors?per_page=100',
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch contributors');
                }
                const data = await response.json();
                const filteredContributors = data.filter((contributor: Contributor) => {
                    return contributor.avatar_url && !contributor.login.includes('[bot]');
                });
                setContributors(filteredContributors);
            } catch (error) {
                console.error('Failed to fetch contributors:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContributors();
    }, []);

    if (!mounted) {
        return null;
    }

    // Tighter radii for mobile
    const innerRadius = isMd ? 260 * 1.4 : 260;
    const outerRadius = isMd ? 340 * 1.4 : 380;
    const size = 840;
    const center = size / 2;

    // Number of faces in each ring
    const innerRingCount = isMd ? 24 : Math.floor(24 * 0.6);
    const outerRingCount = isMd ? 30 : Math.floor(30 * 0.6);

    return (
        <div
            className="pointer-events-none absolute top-1/2 left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2"
            style={{ width: size, height: size }}
        >
            {/* Inner ring (clockwise) */}
            <div className="spin-normal absolute top-1/2 left-1/2 h-full w-full">
                {Array.from({ length: innerRingCount }).map((_, i) => {
                    const angle = (i / innerRingCount) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * innerRadius;
                    const y = center + Math.sin(angle) * innerRadius;
                    const contributor =
                        !isLoading && contributors.length > 0
                            ? contributors[i % contributors.length]
                            : null;
                    return (
                        <div
                            key={`inner-${i}`}
                            className="border-foreground-primary/40 counter-spin absolute overflow-hidden rounded-full border border-[0.5px] bg-white/20 shadow-lg"
                            style={{
                                width: '56px',
                                height: '56px',
                                left: `${x - 28}px`,
                                top: `${y - 28}px`,
                                transformOrigin: 'center center',
                            }}
                        >
                            {contributor && (
                                <img
                                    src={contributor.avatar_url}
                                    alt={`${contributor.login}'s avatar`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Outer ring */}
            <div className="spin-reverse absolute top-1/2 left-1/2 h-full w-full">
                {Array.from({ length: outerRingCount }).map((_, i) => {
                    const angle = (i / outerRingCount) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * outerRadius;
                    const y = center + Math.sin(angle) * outerRadius;
                    const contributorIndex = (i + innerRingCount) % (contributors.length || 1);
                    const contributor =
                        !isLoading && contributors.length > 0
                            ? contributors[contributorIndex]
                            : null;
                    return (
                        <div
                            key={`outer-${i}`}
                            className="border-foreground-primary/40 counter-spin-reverse absolute overflow-hidden rounded-full border border-[0.5px] bg-white/20 shadow-lg"
                            style={{
                                width: '56px',
                                height: '56px',
                                left: `${x - 28}px`,
                                top: `${y - 28}px`,
                                transformOrigin: 'center center',
                            }}
                        >
                            {contributor && (
                                <img
                                    src={contributor.avatar_url}
                                    alt={`${contributor.login}'s avatar`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface ContributorSectionProps {
    contributorCount?: number;
    githubLink?: string;
    discordLink?: string;
}

export function ContributorSection({
    contributorCount = 9412,
    githubLink = 'https://github.com/onlook-dev/onlook',
    discordLink = 'https://discord.gg/ZZzadNQtns',
}: ContributorSectionProps) {
    const [starCount, setStarCount] = useState<string>('0');
    const [isLoading, setIsLoading] = useState(true);

    const formatStarCount = (count: number): string => {
        return count.toLocaleString();
    };

    useEffect(() => {
        const fetchStarCount = async () => {
            try {
                const response = await fetch('https://api.github.com/repos/onlook-dev/onlook');
                const data = await response.json();
                setStarCount(formatStarCount(data.stargazers_count));
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch star count:', error);
                setStarCount(formatStarCount(contributorCount));
                setIsLoading(false);
            }
        };

        fetchStarCount();
    }, [contributorCount]);

    return (
        <div className="relative mt-8 flex w-full items-center justify-center overflow-hidden px-4 py-32">
            {/* Main Contributors Content */}
            <div
                className="bg-background-onlook relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-center overflow-hidden rounded-3xl px-12 py-32 shadow-xl [--md-scale:0] md:[--md-scale:1]"
                style={{ minWidth: 420 }}
            >
                {/* Floating Circles: two concentric rings */}
                <FloatingRings />
                <h2 className="text-foreground-primary mb-2 text-center text-3xl font-light md:text-4xl">
                    Supported by you &<br />
                    {isLoading ? '...' : starCount} other builders
                </h2>
                <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-center">
                    Join the community building <br /> the open source prompt-to-build app
                </p>
                <div className="flex w-full flex-col items-center justify-center gap-4 md:flex-row">
                    <Link
                        href={githubLink}
                        target="_blank"
                        className="bg-foreground-primary text-background-primary text-regularPlus hover:bg-foreground-primary/80 flex cursor-pointer items-center gap-2 rounded-lg px-6 py-3 shadow transition"
                    >
                        Contribute to Onlook
                        <Icons.GitHubLogo className="h-4.5 w-4.5" />
                    </Link>
                    <Link
                        href={discordLink}
                        target="_blank"
                        className="border-foreground-primary/50 text-foreground-primary text-regularPlus hover:bg-foreground-primary/10 flex cursor-pointer items-center gap-2 rounded-lg border px-6 py-3 transition"
                    >
                        Join the Discord
                        <Icons.DiscordLogo className="h-4.5 w-4.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
