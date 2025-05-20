'use client';

import React from 'react';

// Floating Circles: two concentric rings
const FloatingRings = () => {
    const [isMd, setIsMd] = React.useState(
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
    );

    React.useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const listener = () => setIsMd(media.matches);
        media.addEventListener('change', listener);
        setIsMd(media.matches);
        return () => media.removeEventListener('change', listener);
    }, []);

    // Tighter radii for mobile
    const innerRadius = isMd ? 260 * 1.6 : 260;
    const outerRadius = isMd ? 340 * 1.7 : 360;
    const size = 840;
    const center = size / 2;

    return (
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square"
            style={{ width: 840, height: 840 }}
        >
            {/* Inner ring (clockwise) */}
            <div className="absolute left-1/2 top-1/2" style={{ width: '100%', height: '100%', transform: 'translate(-50%, -50%)', animation: 'spin 280s linear infinite' }}>
                {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i / 24) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * innerRadius;
                    const y = center + Math.sin(angle) * innerRadius;
                    return (
                        <div
                            key={`inner-${i}`}
                            className="absolute rounded-full bg-white/20 border border-white/40 shadow-lg"
                            style={{
                                width: 56,
                                height: 56,
                                left: x - 28,
                                top: y - 28,
                            }}
                        />
                    );
                })}
            </div>
            {/* Outer ring (counter-clockwise) */}
            <div className="absolute left-1/2 top-1/2" style={{ width: '100%', height: '100%', transform: 'translate(-50%, -50%)', animation: 'spin-reverse 290s linear infinite' }}>
                {Array.from({ length: 30 }).map((_, i) => {
                    const angle = (i / 30) * 2 * Math.PI;
                    const x = center + Math.cos(angle) * outerRadius;
                    const y = center + Math.sin(angle) * outerRadius;
                    return (
                        <div
                            key={`outer-${i}`}
                            className="absolute rounded-full bg-white/20 border border-white/40 shadow-lg"
                            style={{
                                width: 56,
                                height: 56,
                                left: x - 28,
                                top: y - 28,
                            }}
                        />
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
    githubLink = "#",
    discordLink = "#"
}: ContributorSectionProps) {
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
                `}</style>
                <h2 className="text-foreground-primary text-3xl md:text-4xl font-light text-center mb-2">Supported by You &<br />{contributorCount.toLocaleString()} other contributors</h2>
                <p className="text-foreground-secondary text-regular text-center mb-8 max-w-xl">Join our mission and be a part of changing<br />the way people craft software</p>
                <div className="flex gap-4 flex-col md:flex-row w-full justify-center items-center">
                    <a href={githubLink} className="bg-white text-black font-medium rounded-lg px-6 py-3 flex items-center gap-2 shadow hover:bg-gray-100 transition">
                        Help build Onlook
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.112-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.579.688.481C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10Z" /></svg>
                    </a>
                    <a href={discordLink} className="border border-white/40 text-white font-medium rounded-lg px-6 py-3 flex items-center gap-2 hover:bg-white/10 transition">
                        Join the Discord
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.112.112 0 0 0-.12.056c-.524.908-.995 1.868-1.41 2.87a18.524 18.524 0 0 0-5.71 0A13.06 13.06 0 0 0 8.23 3.257a.115.115 0 0 0-.12-.057c-1.433.36-2.814.888-4.117 1.61a.105.105 0 0 0-.05.042C.533 9.043-.32 13.579.099 18.057a.117.117 0 0 0 .045.083c1.733 1.277 3.415 2.052 5.077 2.568a.115.115 0 0 0 .125-.042c.391-.537.74-1.1 1.045-1.684a.112.112 0 0 0-.062-.158c-.552-.21-1.08-.463-1.59-.755a.112.112 0 0 1-.011-.186c.107-.08.214-.163.316-.246a.112.112 0 0 1 .114-.01c3.162 1.444 6.594 1.444 9.72 0a.112.112 0 0 1 .115.009c.102.083.209.166.316.246a.112.112 0 0 1-.01.186c-.51.292-1.038.545-1.59.755a.112.112 0 0 0-.062.158c.305.584.654 1.147 1.045 1.684a.115.115 0 0 0 .125.042c1.67-.516 3.353-1.291 5.077-2.568a.115.115 0 0 0 .045-.083c.5-5.177-.838-9.673-3.548-13.646a.093.093 0 0 0-.048-.042ZM8.02 15.331c-1.006 0-1.823-.92-1.823-2.051 0-1.13.807-2.05 1.823-2.05 1.025 0 1.832.92 1.823 2.05 0 1.13-.807 2.051-1.823 2.051Zm7.974 0c-1.006 0-1.823-.92-1.823-2.051 0-1.13.807-2.05 1.823-2.05 1.025 0 1.832.92 1.823 2.05 0 1.13-.798 2.051-1.823 2.051Z" /></svg>
                    </a>
                </div>
            </div>
        </div>
    );
} 