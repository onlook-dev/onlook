import { Icons } from '@onlook/ui/icons';
import React, { useState, useEffect } from 'react';

function VersionRow({ title, subtitle, children, selected, onClick }: { title: string, subtitle: string, children?: React.ReactNode, selected?: boolean, onClick?: () => void }) {
    return (
        <div
            className={`flex flex-row items-center justify-between px-4 py-3 cursor-pointer transition-colors ${selected ? 'bg-background-onlook/90' : 'bg-transparent'} hover:bg-background-onlook/90`}
            onClick={onClick}
        >
            <div>
                <div className="text-foreground-primary text-mini font-medium mb-1">{title}</div>
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
            <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                {/* Versions mockup */}
                <div className="w-100 h-100 rounded-xl overflow-hidden absolute right-[-150px] top-10 flex flex-col items-center justify-start bg-black/85 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20 shadow-lg z-40">
                    <p className="text-foreground-primary text-regular font-light w-full text-left px-4 py-3 border-b-[0.5px] border-foreground-primary/20">Versions</p>
                    <div className="w-full h-full overflow-y-auto px-0 py-2 flex flex-col gap-2">
                        {/* Today */}
                        <div className="text-foreground-secondary text-xs mt-1 px-4">Today</div>
                        <div className="flex flex-col gap-0 mb-2 border-b-[0.5px] border-foreground-primary/20 pb-2">
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
                        <div className="text-foreground-secondary text-xs mt-2 px-4">Yesterday</div>
                    </div>
                </div>
                {/* Demo Sites with image and color background */}
                <div 
                    key={selectedVersionIdx}
                    className={`w-100 h-100 rounded-sm overflow-hidden absolute left-7 top-20 flex flex-col items-center justify-start border-[0.5px] border-foreground-primary/20 shadow-lg z-10 transition-all duration-200 ease-in-out relative ${demoColors[selectedVersionIdx]} transform ${isAnimating ? 'scale-95' : 'scale-100'} ${isFading ? 'opacity-50' : 'opacity-100'}`}
                >
                    {demoImages[displayedImageIdx] && (
                        <img
                            src={demoImages[displayedImageIdx]}
                            alt="Site version preview"
                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-200 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
                            style={{ zIndex: 2 }}
                        />
                    )}
                </div>
            </div>
            <div className="flex flex-row items-start gap-8 w-full">
                {/* Icon + Title */}
                <div className="flex flex-col items-start w-1/2">
                    <div className="mb-2"><Icons.CounterClockwiseClock className="w-6 h-6 text-foreground-primary" /></div>
                    <span className="text-foreground-primary text-largePlus font-light">Revision history</span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular text-balance w-1/2">Never lose your progress – revert when you need to</p>
            </div>
        </div>
    );
} 