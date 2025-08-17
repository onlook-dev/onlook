'use client';

import './contributor.css';

import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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
                const response = await fetch('https://api.github.com/repos/onlook-dev/onlook/contributors?per_page=100');
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
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square pointer-events-none"
            style={{ width: size, height: size }}
        >
            {/* Inner ring (clockwise) */}
            <div className="absolute left-1/2 top-1/2 w-full h-full spin-normal">
                {Array.from({ length: innerRingCount }).map((_, i) => {
                    const angle = (i / innerRingCount) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * innerRadius;
                    const y = center + Math.sin(angle) * innerRadius;
                    const contributor = !isLoading && contributors.length > 0 ? contributors[i % contributors.length] : null;
                    return (
                        <div
                            key={`inner-${i}`}
                            className="absolute rounded-full bg-white/20 border border-foreground-primary/40 border-[0.5px] shadow-lg overflow-hidden counter-spin"
                            style={{
                                width: '56px',
                                height: '56px',
                                left: `${x - 28}px`,
                                top: `${y - 28}px`,
                                transformOrigin: 'center center'
                            }}
                        >
                            {contributor && (
                                <img
                                    src={contributor.avatar_url}
                                    alt={`${contributor.login}'s avatar`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            {/* Outer ring */}
            <div className="absolute left-1/2 top-1/2 w-full h-full spin-reverse">
                {Array.from({ length: outerRingCount }).map((_, i) => {
                    const angle = (i / outerRingCount) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * outerRadius;
                    const y = center + Math.sin(angle) * outerRadius;
                    const contributorIndex = (i + innerRingCount) % (contributors.length || 1);
                    const contributor = !isLoading && contributors.length > 0 ? contributors[contributorIndex] : null;
                    return (
                        <div
                            key={`outer-${i}`}
                            className="absolute rounded-full bg-white/20 border border-foreground-primary/40 border-[0.5px] shadow-lg overflow-hidden counter-spin-reverse"
                            style={{
                                width: '56px',
                                height: '56px',
                                left: `${x - 28}px`,
                                top: `${y - 28}px`,
                                transformOrigin: 'center center'
                            }}
                        >
                            {contributor && (
                                <img
                                    src={contributor.avatar_url}
                                    alt={`${contributor.login}'s avatar`}
                                    className="w-full h-full object-cover"
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
    githubLink = "https://github.com/onlook-dev/onlook",
    discordLink = "https://discord.gg/ZZzadNQtns"
}: ContributorSectionProps) {
    const [starCount, setStarCount] = useState<string>("0");
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
        <div className="relative w-full flex items-center justify-center py-32 mt-8 overflow-hidden px-4">
            {/* Main Contributors Content */}
            <div className="w-full max-w-6xl mx-auto relative z-10 flex flex-col items-center justify-center bg-background-onlook rounded-3xl px-12 py-32 shadow-xl overflow-hidden md:[--md-scale:1] [--md-scale:0]" style={{ minWidth: 420 }}>
                {/* Floating Circles: two concentric rings */}
                <FloatingRings />
                <h2 className="text-foreground-primary text-3xl md:text-4xl font-light text-center mb-2">
                    Supported by you &<br />
                    {isLoading ? '...' : starCount} other builders
                </h2>
                <p className="text-foreground-secondary text-regular text-center mb-8 max-w-xl">Join the community building <br /> the open source prompt-to-build app</p>
                <div className="flex gap-4 flex-col md:flex-row w-full justify-center items-center">
                    <Link
                        href={githubLink}
                        target="_blank"
                        className="bg-foreground-primary text-background-primary text-regularPlus rounded-lg px-6 py-3 flex items-center gap-2 shadow hover:bg-foreground-primary/80 transition cursor-pointer"
                    >
                        Contribute to Onlook
                        <Icons.GitHubLogo className="w-4.5 h-4.5" />
                    </Link>
                    <Link
                        href={discordLink}
                        target="_blank"
                        className="border border-foreground-primary/50 text-foreground-primary text-regularPlus rounded-lg px-6 py-3 flex items-center gap-2 hover:bg-foreground-primary/10 transition cursor-pointer"
                    >
                        Join the Discord
                        <Icons.DiscordLogo className="w-4.5 h-4.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
} 