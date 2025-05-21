'use client';

import React, { useEffect, useState } from 'react';
import { Icons } from '@onlook/ui/icons/index';

interface Contributor {
    login: string;
    avatar_url: string;
    id: number;
}

// Floating Circles: two concentric rings
const FloatingRings = () => {
    const [isMd, setIsMd] = React.useState(
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
    );
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
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
                const data = await response.json();
                
                const filteredContributors = data.filter((contributor: Contributor) => {
                    if (!contributor.avatar_url) return false;
                    
                    if (contributor.login.includes('[bot]')) return false;
                    
                    return true;
                });
                setContributors(filteredContributors);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch contributors:', error);
                setIsLoading(false);
            }
        };

        fetchContributors();
    }, []);

    // Tighter radii for mobile
    const innerRadius = isMd ? 260 * 1.5 : 280;
    const outerRadius = isMd ? 340 * 1.5 : 380;
    const size = 840;
    const center = size / 2;

    return (
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square pointer-events-none"
            style={{ width: 840, height: 840 }}
        >
            {/* Inner ring (clockwise) */}
            <div className="absolute left-1/2 top-1/2" style={{ width: '100%', height: '100%', transform: 'translate(-50%, -50%)', animation: 'spin 280s linear infinite' }}>
                {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i / 24) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * innerRadius;
                    const y = center + Math.sin(angle) * innerRadius;
                    const contributor = !isLoading && contributors.length > 0 ? contributors[i % contributors.length] : null;
                    return (
                        <div
                            key={`inner-${i}`}
                            className="absolute rounded-full bg-white/20 border border-foreground-primary/40 border-[0.5px] shadow-lg overflow-hidden"
                            style={{
                                width: 56,
                                height: 56,
                                left: x - 28,
                                top: y - 28,
                                animation: 'counter-spin 280s linear infinite'
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
            {/* Outer ring (counter-clockwise) */}
            <div className="absolute left-1/2 top-1/2" style={{ width: '100%', height: '100%', transform: 'translate(-50%, -50%)', animation: 'spin-reverse 290s linear infinite' }}>
                {Array.from({ length: 30 }).map((_, i) => {
                    const angle = (i / 30) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * outerRadius;
                    const y = center + Math.sin(angle) * outerRadius;
                    const contributorIndex = (i + 24) % (contributors.length || 1);
                    const contributor = !isLoading && contributors.length > 0 ? contributors[contributorIndex] : null;
                    return (
                        <div
                            key={`outer-${i}`}
                            className="absolute rounded-full bg-white/20 border border-foreground-primary/40 border-[0.5px] shadow-lg overflow-hidden"
                            style={{
                                width: 56,
                                height: 56,
                                left: x - 28,
                                top: y - 28,
                                animation: 'counter-spin-reverse 290s linear infinite'
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
        <div className="relative w-full flex items-center justify-center py-32 mt-8 overflow-hidden">
            {/* Main Contributors Content */}
            <div className="w-full max-w-6xl mx-auto relative z-10 flex flex-col items-center justify-center bg-background-onlook rounded-3xl px-12 py-32 shadow-xl overflow-hidden md:[--md-scale:1] [--md-scale:0]" style={{ minWidth: 420 }}>
                {/* Floating Circles: two concentric rings */}
                <FloatingRings />
                <style>{`
                    @keyframes spin {
                        from {
                            transform: translate(-50%, -50%) rotate(0deg);
                        }
                        to {
                            transform: translate(-50%, -50%) rotate(360deg);
                        }
                    }
                    @keyframes spin-reverse {
                        from {
                            transform: translate(-50%, -50%) rotate(0deg);
                        }
                        to {
                            transform: translate(-50%, -50%) rotate(-360deg);
                        }
                    }
                    @keyframes counter-spin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(-360deg);
                        }
                    }
                    @keyframes counter-spin-reverse {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(360deg);
                        }
                    }
                `}</style>
                <h2 className="text-foreground-primary text-3xl md:text-4xl font-light text-center mb-2">
                    Supported by You &<br />
                    {isLoading ? '...' : starCount} other builders
                </h2>
                <p className="text-foreground-secondary text-regular text-center mb-8 max-w-xl">Join our mission and be a part of changing<br />the way people craft software</p>
                <div className="flex gap-4 flex-col md:flex-row w-full justify-center items-center">
                    <button 
                        onClick={() => window.open(githubLink, '_blank')}
                        className="bg-foreground-primary text-background-primary text-regularPlus rounded-lg px-6 py-3 flex items-center gap-2 shadow hover:bg-foreground-primary/80 transition cursor-pointer"
                    >
                        Contribute to Onlook
                        <Icons.GitHubLogo className="w-4.5 h-4.5" />
                    </button>
                    <button 
                        onClick={() => window.open(discordLink, '_blank')}
                        className="border border-foreground-primary/50 text-foreground-primary text-regularPlus rounded-lg px-6 py-3 flex items-center gap-2 hover:bg-foreground-primary/10 transition cursor-pointer"
                    >
                        Join the Discord
                        <Icons.DiscordLogo className="w-4.5 h-4.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}         