import React, { useEffect, useState } from 'react';

import { Icons } from '@onlook/ui/icons';

function VersionRow({
    title,
    subtitle,
    children,
    selected,
    onClick,
}: {
    title: string;
    subtitle: string;
    children?: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            className={`flex cursor-pointer flex-row items-center justify-between px-4 py-3 transition-colors ${selected ? 'bg-background-onlook/90' : 'bg-transparent'} hover:bg-background-onlook/90`}
            onClick={onClick}
        >
            <div>
                <div className="text-foreground-primary text-mini mb-1 font-medium">{title}</div>
                <div className="text-foreground-tertiary text-mini font-light">{subtitle}</div>
            </div>
            {children && <div className="flex flex-row gap-1">{children}</div>}
        </div>
    );
}

export function RevisionHistory() {
    // Carousel state for Demo Sites
    const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
    const [displayedImageIdx, setDisplayedImageIdx] = useState(0); // New state for delayed image display
    const [isAnimating, setIsAnimating] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const [lastUserInteraction, setLastUserInteraction] = useState(Date.now());

    // Demo colors for carousel
    const demoColors = [
        'bg-gradient-to-br from-gray-400 to-gray-700',
        'bg-gradient-to-br from-gray-400 to-gray-700',
        'bg-gradient-to-br from-gray-400 to-gray-700',
        'bg-gradient-to-br from-gray-400 to-gray-700',
    ];

    // Demo images for carousel (null if no image)
    const demoImages = [
        '/assets/site-version-1.png',
        '/assets/site-version-2.png',
        '/assets/site-version-3.png',
        '/assets/site-version-4.png',
    ];

    // Version data for Today section
    const todayVersions = [
        { title: 'New typography and layout', subtitle: 'Alessandro · 3h ago' },
        { title: 'Update colors', subtitle: 'Jonathan · 10h ago' },
        { title: 'Added new background image', subtitle: 'Sandra · 12h ago' },
        { title: 'Copy improvements and new branding', subtitle: 'Jonathan · 3d ago' },
    ];

    useEffect(() => {
        setIsAnimating(true);
        setIsFading(true);
        const timer = setTimeout(() => {
            setIsAnimating(false);
            setIsFading(false);
        }, 200);
        return () => clearTimeout(timer);
    }, [selectedVersionIdx]);

    // Delayed image update effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDisplayedImageIdx(selectedVersionIdx);
        }, 230); // 0.23 second delay

        return () => clearTimeout(timer);
    }, [selectedVersionIdx]);

    // Auto-rotation effect
    useEffect(() => {
        const rotationInterval = setInterval(() => {
            const now = Date.now();
            // Only rotate if it's been 4 seconds since last user interaction
            if (now - lastUserInteraction >= 4000) {
                setSelectedVersionIdx((prev) => (prev + 1) % demoColors.length);
            }
        }, 4000);

        return () => clearInterval(rotationInterval);
    }, [lastUserInteraction]);

    // Handle version selection
    const handleVersionSelect = (idx: number) => {
        setSelectedVersionIdx(idx);
        setLastUserInteraction(Date.now());
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-background-onlook/80 relative mb-6 h-100 w-full overflow-hidden rounded-lg">
                {/* Versions mockup */}
                <div className="border-foreground-primary/20 absolute top-10 right-[-150px] z-40 flex h-100 w-100 flex-col items-center justify-start overflow-hidden rounded-xl border-[0.5px] bg-black/85 shadow-lg backdrop-blur-2xl">
                    <p className="text-foreground-primary text-regular border-foreground-primary/20 w-full border-b-[0.5px] px-4 py-3 text-left font-light">
                        Versions
                    </p>
                    <div className="flex h-full w-full flex-col gap-2 overflow-y-auto px-0 py-2">
                        {/* Today */}
                        <div className="text-foreground-secondary mt-1 px-4 text-xs">Today</div>
                        <div className="border-foreground-primary/20 mb-2 flex flex-col gap-0 border-b-[0.5px] pb-2">
                            {todayVersions.map((v, idx) => (
                                <VersionRow
                                    key={v.title}
                                    title={v.title}
                                    subtitle={v.subtitle}
                                    selected={selectedVersionIdx === idx}
                                    onClick={() => handleVersionSelect(idx)}
                                />
                            ))}
                        </div>
                        {/* Yesterday */}
                        <div className="text-foreground-secondary mt-2 px-4 text-xs">Yesterday</div>
                    </div>
                </div>
                {/* Demo Sites with image and color background */}
                <div
                    key={selectedVersionIdx}
                    className={`border-foreground-primary/20 absolute relative top-20 left-7 z-10 flex h-100 w-100 flex-col items-center justify-start overflow-hidden rounded-sm border-[0.5px] shadow-lg transition-all duration-200 ease-in-out ${demoColors[selectedVersionIdx]} transform ${isAnimating ? 'scale-95' : 'scale-100'} ${isFading ? 'opacity-50' : 'opacity-100'}`}
                >
                    {demoImages[displayedImageIdx] && (
                        <img
                            src={demoImages[displayedImageIdx]}
                            alt="Site version preview"
                            className={`absolute inset-0 h-full w-full object-cover transition-all duration-200 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
                            style={{ zIndex: 2 }}
                        />
                    )}
                </div>
            </div>
            <div className="flex w-full flex-row items-start gap-8">
                {/* Icon + Title */}
                <div className="flex w-1/2 flex-col items-start">
                    <div className="mb-2">
                        <Icons.CounterClockwiseClock className="text-foreground-primary h-6 w-6" />
                    </div>
                    <span className="text-foreground-primary text-largePlus font-light">
                        Revision history
                    </span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular w-1/2 text-balance">
                    Never lose your progress – revert when you need to
                </p>
            </div>
        </div>
    );
}
