import { Icons } from '@onlook/ui/icons';
import { MockLayersTab } from './mock-layers-tab';
import { ColorSwatchGroup } from './color-swatch-group';
import React, { useState, useEffect, useRef, useCallback } from 'react';

function VersionRow({ title, subtitle, children, selected, onClick }: { title: string, subtitle: string, children?: React.ReactNode, selected?: boolean, onClick?: () => void }) {
    return (
        <div
            className={`flex flex-row items-center justify-between px-4 py-3 cursor-pointer transition-colors rounded ${selected ? 'bg-background-onlook/90' : 'bg-transparent'} hover:bg-background-onlook/90`}
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
    // Carousel state for Demo Sites
    const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isFading, setIsFading] = useState(false);
    const [selectedElement, setSelectedElement] = useState<string | null>('text2');
    const [isUserSelected, setIsUserSelected] = useState(false);
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
        null,
        null,
    ];
    // Version data for Today section
    const todayVersions = [
        { title: 'New typography and layout', subtitle: 'Alessandro · 3h ago' },
        { title: 'Save before publishing', subtitle: 'Onlook · 10h ago' },
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
        <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row gap-24 md:gap-24">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-24">
                {/* Section Title */}
                <h2 className="text-foreground-primary text-[4vw] leading-[1.1] font-light mb-8 max-w-xl">What can<br />Onlook do?</h2>
                {/* Direct editing */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 overflow-hidden">
                        <div className="w-90 h-100 bg-white rounded relative left-1/2 top-56 transform -translate-x-1/2 -translate-y-1/2">
                            <div 
                                className="absolute cursor-move select-none text-blue text-xl font-light draggable-text"
                                style={{ 
                                    top: '30%', 
                                    left: '50%', 
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 1,
                                    minWidth: '100px',
                                    minHeight: '30px',
                                    padding: '8px',
                                    border: '1px solid transparent',
                                    outline: selectedElement === 'text1' ? '2px solid #3b82f6' : 'none',
                                    outlineOffset: '-1px',
                                    borderRadius: '1px'
                                }}
                                onClick={() => handleClick('text1')}
                                draggable
                                onDragStart={(e) => {
                                    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
                                        e.preventDefault();
                                        return;
                                    }
                                    e.dataTransfer.setData('text/plain', '');
                                    e.currentTarget.style.opacity = '0.5';
                                }}
                                onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    e.currentTarget.style.left = `${x}px`;
                                    e.currentTarget.style.top = `${y}px`;
                                    e.currentTarget.style.transform = 'none';
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedElement === 'text1') {
                                        e.currentTarget.style.border = '1px solid #ccc';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.border = '1px solid transparent';
                                }}
                            >
                                Drag me anywhere
                                {selectedElement === 'text1' && (
                                    <>
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                            style={{ 
                                                right: '-4px', 
                                                bottom: '-4px',
                                                border: '1px solid #3b82f6',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'bottom-right')}
                                        />
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                            style={{ 
                                                left: '-4px', 
                                                bottom: '-4px',
                                                border: '1px solid #3b82f6',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'bottom-left')}
                                        />
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                            style={{ 
                                                right: '-4px', 
                                                top: '-4px',
                                                border: '1px solid #3b82f6',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'top-right')}
                                        />
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                            style={{ 
                                                left: '-4px', 
                                                top: '-4px',
                                                border: '1px solid #3b82f6',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'top-left')}
                                        />
                                    </>
                                )}
                            </div>
                            <div 
                                className="absolute cursor-move select-none text-red-500 text-xl font-light draggable-text"
                                style={{ 
                                    top: '70%', 
                                    left: '50%', 
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 2,
                                    minWidth: '100px',
                                    minHeight: '30px',
                                    padding: '8px',
                                    border: '1px solid transparent',
                                    outline: selectedElement === 'text2' ? '2px solid #ef4444' : 'none',
                                    outlineOffset: '-1px',
                                    borderRadius: '1px'
                                }}
                                onClick={() => handleClick('text2')}
                                draggable
                                onDragStart={(e) => {
                                    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
                                        e.preventDefault();
                                        return;
                                    }
                                    e.dataTransfer.setData('text/plain', '');
                                    e.currentTarget.style.opacity = '0.5';
                                }}
                                onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    e.currentTarget.style.left = `${x}px`;
                                    e.currentTarget.style.top = `${y}px`;
                                    e.currentTarget.style.transform = 'none';
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedElement === 'text2') {
                                        e.currentTarget.style.border = '1px solid #ccc';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.border = '1px solid transparent';
                                }}
                            >
                                I can go on top
                                {selectedElement === 'text2' && (
                                    <>
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                            style={{ 
                                                right: '-4px', 
                                                bottom: '-4px',
                                                border: '1px solid #ef4444',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'bottom-right')}
                                        />
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                            style={{ 
                                                left: '-4px', 
                                                bottom: '-4px',
                                                border: '1px solid #ef4444',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'bottom-left')}
                                        />
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                            style={{ 
                                                right: '-4px', 
                                                top: '-4px',
                                                border: '1px solid #ef4444',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'top-right')}
                                        />
                                        <div 
                                            className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                            style={{ 
                                                left: '-4px', 
                                                top: '-4px',
                                                border: '1px solid #ef4444',
                                                boxShadow: '0 0 0 1px white'
                                            }}
                                            onMouseDown={(e) => handleResize(e, 'top-left')}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.DirectManipulation className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Direct editing</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Drag-and-drop, rearrange, scale, and more with elements directly in the editor.</p>
                    </div>
                </div>
                {/* Components */}
                <div className="flex flex-col gap-4">
                    {/* Custom Components Menu + Calendar Preview */}
                    <div className="flex flex-row gap-8 relative min-h-[400px] overflow-hidden bg-background-onlook/80 rounded-lg">
                        {/* Left menu container with grey background and overflow hidden */}
                        <div className="w-56 h-100 rounded-xl overflow-hidden absolute left-8 top-12 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                            <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Components</p>
                            <div className="grid grid-cols-2 grid-rows-3 gap-6 w-full h-full p-4">
                                {[
                                    { label: 'Calendar', selected: true },
                                    { label: 'Card', selected: false },
                                    { label: 'Carousel', selected: false },
                                    { label: 'Chart', selected: false },
                                    { label: 'Table', selected: false },
                                    { label: 'Map', selected: false },
                                ].map((item, idx) => (
                                    <div key={item.label} className="flex flex-col items-center w-full">
                                        <div
                                            className={
                                                `w-24 h-18 rounded-xs mb-2 flex items-start bg-background-secondary justify-start transition-all ` +
                                                (item.selected
                                                    ? 'outline outline-1 outline-purple-400 outline-offset-2'
                                                    : '')
                                            }
                                        >
                                            {/* Placeholder for component preview */}
                                            <div className="w-24 h-24 rounded" />
                                        </div>
                                        <span className="text-foreground-primary text-xs text-left w-full">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Floating calendar preview */}
                        <div className="absolute left-50 top-30 z-10">
                            <div className="rounded-xl border-1 border-purple-400 bg-black p-4 min-w-[240px]" style={{ fontSize: '0.6rem' }}>
                                {/* Calendar header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-1">
                                        <button className="px-2 py-0.5 rounded bg-zinc-900 text-foreground-primary text-xs flex items-center">
                                            {new Date().toLocaleString('default', { month: 'short' })} 
                                            <svg width='8' height='8' className='ml-1'><path d='M2 3l2 2 2-2' stroke='white' strokeWidth='1' fill='none'/></svg>
                                        </button>
                                        <button className="px-2 py-0.5 rounded bg-zinc-900 text-foreground-primary text-xs flex items-center">
                                            {new Date().getFullYear()} 
                                            <svg width='8' height='8' className='ml-1'><path d='M2 3l2 2 2-2' stroke='white' strokeWidth='1' fill='none'/></svg>
                                        </button>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="text-foreground-primary hover:text-foreground-primary text-xs">&#60;</button>
                                        <button className="text-foreground-primary hover:text-foreground-primary text-xs">&#62;</button>
                                    </div>
                                </div>
                                {/* Calendar grid */}
                                <div className="grid grid-cols-7 gap-[2px] text-center text-zinc-400 text-xs mb-2 cursor-pointer">
                                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d}>{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-[2px] text-center cursor-pointer">
                                    {(() => {
                                        const today = new Date();
                                        const currentMonth = today.getMonth();
                                        const currentYear = today.getFullYear();
                                        const firstDay = new Date(currentYear, currentMonth, 1);
                                        const lastDay = new Date(currentYear, currentMonth + 1, 0);
                                        const daysInMonth = lastDay.getDate();
                                        const startingDay = firstDay.getDay();
                                        
                                        return Array.from({length: 42}, (_,i) => {
                                            const day = i - startingDay + 1;
                                            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                                            
                                            if (day < 1 || day > daysInMonth) return <div key={i}></div>;
                                            
                                            return (
                                                <div
                                                    key={i}
                                                    className={
                                                        `py-[2px] rounded-full text-xs ` +
                                                        (isToday ? 'bg-white text-black font-bold' : 'hover:bg-zinc-800 text-zinc-200')
                                                    }
                                                >
                                                    {day}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Component className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Components</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Customize reusable components that you can swap-out across websites.</p>
                    </div>
                </div>
                {/* Layers */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                    <div className="w-56 h-100 rounded-xl overflow-hidden absolute left-8 top-12 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                        <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Layers</p>
                        <div className="flex flex-row items-start gap-8 w-full">
                         <MockLayersTab />
                        </div>
                    </div>
                    </div>
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Layers className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Layers</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Select elements with precision and control.</p>
                    </div>
                </div>
            </div>
            {/* Right Column */}
            <div className="flex-1 flex flex-col gap-18 mt-16 md:mt-32">
                {/* Work in the true product 
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">

                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons. className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Work in the <span className='underline'>true</span> product</span>
                        </div>
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Work an entirely new dimension – experience your designs come to life</p>
                    </div>
                </div> */}
                {/* Brand compliance */}
                <div className="flex flex-col gap-4">
                <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                    <ParallaxContainer speed={0.04}>
                        <div className="w-60 h-100 rounded-xl overflow-hidden absolute left-8 top-7 flex flex-col items-center justify-start bg-black/85 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20">
                            <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Brand Colors</p>
                            <div className="w-full h-full overflow-y-auto px-3 py-2 flex flex-col gap-2">
                                <ColorSwatchGroup label="Slate" colorClasses={[
                                    "bg-slate-50","bg-slate-100","bg-slate-200","bg-slate-300","bg-slate-400","bg-slate-500",
                                    "bg-slate-500","bg-slate-600","bg-slate-700","bg-slate-800","bg-slate-900","bg-slate-900"
                                ]} />
                                <ColorSwatchGroup label="Gray" colorClasses={[
                                    "bg-gray-50","bg-gray-100","bg-gray-200","bg-gray-300","bg-gray-400","bg-gray-500",
                                    "bg-gray-500","bg-gray-600","bg-gray-700","bg-gray-800","bg-gray-900","bg-gray-900"
                                ]} />
                                <ColorSwatchGroup label="Zinc" colorClasses={[
                                    "bg-zinc-50","bg-zinc-100","bg-zinc-200","bg-zinc-300","bg-zinc-400","bg-zinc-500",
                                    "bg-zinc-500","bg-zinc-600","bg-zinc-700","bg-zinc-800","bg-zinc-900","bg-zinc-900"
                                ]} />
                                <ColorSwatchGroup label="Orange" colorClasses={[
                                    "bg-orange-50","bg-orange-100","bg-orange-200","bg-orange-300","bg-orange-400","bg-orange-500",
                                    "bg-orange-500","bg-orange-600","bg-orange-700","bg-orange-800","bg-orange-900","bg-orange-900"
                                ]} />
                                <ColorSwatchGroup label="Amber" colorClasses={[
                                    "bg-amber-50","bg-amber-100","bg-amber-200","bg-amber-300","bg-amber-400","bg-amber-500",
                                    "bg-amber-500","bg-amber-600","bg-amber-700","bg-amber-800","bg-amber-900","bg-amber-900"
                                ]} />

                                <ColorSwatchGroup label="Lime" colorClasses={[
                                    "bg-lime-50","bg-lime-100","bg-lime-200","bg-lime-300","bg-lime-400","bg-lime-500",
                                    "bg-lime-500","bg-lime-600","bg-lime-700","bg-lime-800","bg-lime-900","bg-lime-900"
                                ]} />
                                <ColorSwatchGroup label="Green" colorClasses={[
                                    "bg-green-50","bg-green-100","bg-green-200","bg-green-300","bg-green-400","bg-green-500",
                                    "bg-green-500","bg-green-600","bg-green-700","bg-green-800","bg-green-900","bg-green-900"
                                ]} />
                            </div>
                        </div>
                    </ParallaxContainer>
                    <ParallaxContainer speed={-0.04}>
                        <div className="w-60 h-100 rounded-xl overflow-hidden absolute right-10 top-20 flex flex-col items-center justify-start bg-black/50 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20">
                            <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Brand Colors</p>
                            <div className="w-full h-full overflow-y-auto px-3 py-2 flex flex-col gap-2">
                                <ColorSwatchGroup label="Cyan" colorClasses={[
                                    "bg-cyan-50","bg-cyan-100","bg-cyan-200","bg-cyan-300","bg-cyan-400","bg-cyan-500",
                                    "bg-cyan-500","bg-cyan-600","bg-cyan-700","bg-cyan-800","bg-cyan-900","bg-cyan-900"
                                ]} />
                                <ColorSwatchGroup label="Blue" colorClasses={[
                                    "bg-blue-50","bg-blue-100","bg-blue-200","bg-blue-300","bg-blue-400","bg-blue-500",
                                    "bg-blue-500","bg-blue-600","bg-blue-700","bg-blue-800","bg-blue-900","bg-blue-900"
                                ]} />
                                <ColorSwatchGroup label="Indigo" colorClasses={[
                                    "bg-indigo-50","bg-indigo-100","bg-indigo-200","bg-indigo-300","bg-indigo-400","bg-indigo-500",
                                    "bg-indigo-500","bg-indigo-600","bg-indigo-700","bg-indigo-800","bg-indigo-900","bg-indigo-900"
                                ]} />
                                <ColorSwatchGroup label="Violet" colorClasses={[
                                    "bg-violet-50","bg-violet-100","bg-violet-200","bg-violet-300","bg-violet-400","bg-violet-500",
                                    "bg-violet-500","bg-violet-600","bg-violet-700","bg-violet-800","bg-violet-900","bg-violet-900"
                                ]} />
                                <ColorSwatchGroup label="Purple" colorClasses={[
                                    "bg-purple-50","bg-purple-100","bg-purple-200","bg-purple-300","bg-purple-400","bg-purple-500",
                                    "bg-purple-500","bg-purple-600","bg-purple-700","bg-purple-800","bg-purple-900","bg-purple-900"
                                ]} />
                                <ColorSwatchGroup label="Pink" colorClasses={[
                                    "bg-pink-50","bg-pink-100","bg-pink-200","bg-pink-300","bg-pink-400","bg-pink-500",
                                    "bg-pink-500","bg-pink-600","bg-pink-700","bg-pink-800","bg-pink-900","bg-pink-900"
                                ]} />
                                <ColorSwatchGroup label="Rose" colorClasses={[
                                    "bg-rose-50","bg-rose-100","bg-rose-200","bg-rose-300","bg-rose-400","bg-rose-500",
                                    "bg-rose-500","bg-rose-600","bg-rose-700","bg-rose-800","bg-rose-900","bg-rose-900"
                                ]} />
                            </div>
                        </div>
                    </ParallaxContainer>
                    </div>
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Brand className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Brand compliance</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Make your fonts, colors, and styles all speak the same language.</p>
                    </div>
                </div>
                {/* Instantly responsive */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Laptop className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Instantly responsive</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Craft sites that look great on laptops, tablets, and phones with minimal adjustments.</p>
                    </div>
                </div>
                {/* Revision history */}
                <div className="flex flex-col gap-4">
                <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                    {/* Versions mockup */}
                    <div className="w-100 h-100 rounded-xl overflow-hidden absolute right-[-150px] top-10 flex flex-col items-center justify-start bg-black/85 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20 shadow-lg z-50">
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
                            <div className="flex flex-col gap-1 mb-2">
                                <VersionRow title="Save before publishing to kerbz.co.uk" subtitle="Onlook · 12:09 PM" />
                            </div>
                        </div>
                    </div>
                    {/* Demo Sites with image and color background */}
                    <div 
                        key={selectedVersionIdx}
                        className={`w-100 h-100 rounded-sm overflow-hidden absolute left-7 top-20 flex flex-col items-center justify-start border-[0.5px] border-foreground-primary/20 shadow-lg z-10 transition-all duration-200 ease-in-out relative ${demoColors[selectedVersionIdx]} transform ${isAnimating ? 'scale-95' : 'scale-100'} ${isFading ? 'opacity-50' : 'opacity-100'}`}
                    >
                        {demoImages[selectedVersionIdx] && (
                            <img
                                src={demoImages[selectedVersionIdx]}
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
            </div>
        </div>
    );
} 