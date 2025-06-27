import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AiChatPreviewBlock } from './feature-blocks/ai-chat-preview-block';
import { BrandComplianceBlock } from './feature-blocks/brand-compliance';
import { ComponentsBlock } from './feature-blocks/components';
import { DirectEditingBlock } from './feature-blocks/direct-editing';
import { LayersBlock } from './feature-blocks/layers';
import { RevisionHistory } from './feature-blocks/revision-history';

// Hook to detect operating system
function useOperatingSystem() {
    const [os, setOs] = useState<'mac' | 'windows' | 'linux' | 'unknown'>('unknown');

    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('mac')) {
            setOs('mac');
        } else if (userAgent.includes('win')) {
            setOs('windows');
        } else if (userAgent.includes('linux')) {
            setOs('linux');
        } else {
            setOs('unknown');
        }
    }, []);

    return os;
}

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

function ParallaxContainer({ children, speed = 0.1 }: { children: React.ReactNode, speed?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState(0);
    const ticking = useRef(false);
    const lastScrollY = useRef(0);

    const updateTransform = useCallback(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Calculate how far the element is from the center of the viewport
        const distanceFromCenter = rect.top + rect.height / 2 - viewportHeight / 2;

        // Apply transform based on distance from center
        setTransform(distanceFromCenter * speed);

        ticking.current = false;
    }, [speed]);

    useEffect(() => {
        const handleScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(() => {
                    updateTransform();
                });
                ticking.current = true;
            }
        };

        // Use passive scroll listener for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        updateTransform(); // Initial calculation

        return () => window.removeEventListener('scroll', handleScroll);
    }, [updateTransform]);

    return (
        <div
            ref={containerRef}
            style={{
                transform: `translate3d(0, ${transform}px, 0)`,
                transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                perspective: '1000px'
            }}
        >
            {children}
        </div>
    );
}

export function WhatCanOnlookDoSection() {
    // Detect operating system for keyboard shortcuts
    const os = useOperatingSystem();

    // Carousel state for Demo Sites
    const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
    const [displayedImageIdx, setDisplayedImageIdx] = useState(0); // New state for delayed image display
    const [isAnimating, setIsAnimating] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const [selectedElement, setSelectedElement] = useState<string | null>('text2');
    const [isUserSelected, setIsUserSelected] = useState(false);
    const [lastUserInteraction, setLastUserInteraction] = useState(Date.now());

    // Keyboard shortcut carousel state
    const [shortcutLetterIdx, setShortcutLetterIdx] = useState(0);
    const [isShortcutAnimating, setIsShortcutAnimating] = useState(false);

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
        { title: 'Save before publishing', subtitle: 'Onlook · 10h ago' },
        { title: 'Added new background image', subtitle: 'Sandra · 12h ago' },
        { title: 'Copy improvements and new branding', subtitle: 'Jonathan · 3d ago' },
    ];

    // Keyboard shortcut letters to cycle through
    const shortcutLetters = ['Z', 'X', 'C', 'V', 'D', 'G', 'A', 'S'];

    // Get the appropriate keyboard shortcut text
    const getKeyboardShortcut = () => {
        const currentLetter = shortcutLetters[shortcutLetterIdx];
        switch (os) {
            case 'mac':
                return `CMD+${currentLetter}`;
            case 'windows':
            case 'linux':
                return `Ctrl+${currentLetter}`;
            default:
                return `CMD/CTRL+${currentLetter}`; // Fallback for unknown OS
        }
    };

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

    // Keyboard shortcut rotation effect
    useEffect(() => {
        const shortcutInterval = setInterval(() => {
            setIsShortcutAnimating(true);
            setTimeout(() => {
                setShortcutLetterIdx((prev) => (prev + 1) % shortcutLetters.length);
                setIsShortcutAnimating(false);
            }, 150); // Blur out duration
        }, 2000); // Change every 2 seconds

        return () => clearInterval(shortcutInterval);
    }, [shortcutLetters.length]);

    // Handle version selection
    const handleVersionSelect = (idx: number) => {
        setSelectedVersionIdx(idx);
        setLastUserInteraction(Date.now());
    };

    const handleResize = (e: React.MouseEvent, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
        e.stopPropagation();
        const element = e.currentTarget as HTMLDivElement;
        const parent = element.parentElement as HTMLDivElement;
        parent.draggable = false;
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parent.offsetWidth;
        const startHeight = parent.offsetHeight;
        const startLeft = parent.offsetLeft;
        const startTop = parent.offsetTop;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            switch (position) {
                case 'bottom-right':
                    newWidth = Math.max(100, startWidth + deltaX);
                    newHeight = Math.max(30, startHeight + deltaY);
                    break;
                case 'bottom-left':
                    newWidth = Math.max(100, startWidth - deltaX);
                    newHeight = Math.max(30, startHeight + deltaY);
                    newLeft = startLeft + (startWidth - newWidth);
                    break;
                case 'top-right':
                    newWidth = Math.max(100, startWidth + deltaX);
                    newHeight = Math.max(30, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                    break;
                case 'top-left':
                    newWidth = Math.max(100, startWidth - deltaX);
                    newHeight = Math.max(30, startHeight - deltaY);
                    newLeft = startLeft + (startWidth - newWidth);
                    newTop = startTop + (startHeight - newHeight);
                    break;
            }

            parent.style.width = `${newWidth}px`;
            parent.style.height = `${newHeight}px`;
            parent.style.left = `${newLeft}px`;
            parent.style.top = `${newTop}px`;
            parent.style.transform = 'none';
        };

        const handleMouseUp = () => {
            parent.draggable = true;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleClick = (elementId: string) => {
        setSelectedElement(elementId);
    };

    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.draggable-text')) {
            setSelectedElement(null);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <>
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row gap-24 md:gap-24">
                {/* Left Column */}
                <div className="flex-1 flex flex-col gap-24">
                    <h2 className="text-foreground-primary text-6xl leading-[1.1] font-light mb-8 max-w-xl">What can<br />Onlook do?</h2>
                    <DirectEditingBlock />
                    <ComponentsBlock />
                    <RevisionHistory />
                </div>
                {/* Right Column */}
                <div className="flex-1 flex flex-col gap-24 mt-16">
                    <AiChatPreviewBlock />
                    <BrandComplianceBlock />
                    <LayersBlock />
                </div>
            </div>
            {/* Grid extension section */}
            <div className="w-full max-w-6xl mx-auto py-32 px-8">
                <h2 className="text-foreground-primary text-6xl text-right leading-[1.1] font-light mb-20">...and so<br />much more</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-16 gap-y-20">
                    <div>
                        <div className="text-foreground-primary text-regularPlus mb-2 text-balance">Import from GitHub or locally</div>
                        <div className="text-foreground-secondary text-regular text-balance">Bring your existing React / Next.js / Tailwind codebase and start building</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary text-regularPlus mb-2 text-balance">Import from Figma</div>
                        <div className="text-foreground-secondary text-regular text-balance">Make your designs come to life with a real working product</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary text-regularPlus mb-2 text-balance">Publish your work</div>
                        <div className="text-foreground-secondary text-regular text-balance">Attach a custom domain and share your work with the world</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary text-regularPlus mb-2 text-balance">Draw-in Layers</div>
                        <div className="text-foreground-secondary text-regular text-balance">Trace divs and text directly in your designs and create code in real-time</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary text-regularPlus mb-2 text-balance">All your favorite hotkeys</div>
                        <div className="text-foreground-secondary text-regular text-balance">
                            <span className={`transition-all duration-250 mr-1 inline-block ${isShortcutAnimating ? 'blur-sm opacity-50 -translate-x-1' : 'blur-0 opacity-100 translate-x-0'}`}>
                                {getKeyboardShortcut()}
                            </span>
                            and design lightning fast with all your favorite shortcuts
                        </div>
                    </div>
                    <div>
                        <div className="text-foreground-primary text-regularPlus mb-2 text-balance">Use Images and media assets</div>
                        <div className="text-foreground-secondary text-regular text-balance">Manage your graphics and images all from one place</div>
                    </div>
                </div>
            </div>
        </>
    );
} 