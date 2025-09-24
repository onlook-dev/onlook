import React, { useEffect, useRef, useState } from 'react';
import { Laptop, Menu } from 'lucide-react';

export function ResponsiveWebsiteBlock() {
    const [websiteWidth, setWebsiteWidth] = useState(400); // Initial width in pixels
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartWidth, setDragStartWidth] = useState(0);
    const [dragHandle, setDragHandle] = useState<'left' | 'right' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isMobileWidth = websiteWidth < 340;

    const handleMouseDown = (e: React.MouseEvent, handle: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragHandle(handle);
        setDragStartX(e.clientX);
        setDragStartWidth(websiteWidth);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !dragHandle) return;

        requestAnimationFrame(() => {
            const deltaX = e.clientX - dragStartX;
            let newWidth = dragStartWidth;

            if (dragHandle === 'left') {
                newWidth = Math.max(200, Math.min(600, dragStartWidth - deltaX));
            } else {
                newWidth = Math.max(200, Math.min(600, dragStartWidth + deltaX));
            }

            setWebsiteWidth(newWidth);
        });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragHandle(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartX, dragStartWidth, dragHandle]);

    return (
        <div className="flex flex-col gap-4">
            <div
                className="relative mb-6 h-100 w-full overflow-hidden rounded-lg bg-[#2E2C2D]"
                ref={containerRef}
            >
                {/* Mini Website Container */}
                <div
                    className="absolute top-12 left-1/2 h-80 -translate-x-1/2 transform rounded-lg border border-[#D1CFC9] bg-[#E5E3DE] shadow-lg"
                    style={{ width: `${websiteWidth}px` }}
                >
                    {/* Browser Header */}
                    <div className="flex h-8 w-full items-center justify-between rounded-t-lg border-b border-[#D1CFC9] bg-[#E5E3DE] px-3 select-none">
                        <div className="flex items-center gap-2">
                            <h2 className="font-serif text-xs text-[#3C342F] uppercase">Ceramix</h2>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-[#3C342F]">
                            {isMobileWidth ? (
                                <Menu className="h-5 w-5 text-[#3C342F]" />
                            ) : (
                                <>
                                    <span className="cursor-pointer hover:opacity-70">Shop</span>
                                    <span className="cursor-pointer hover:opacity-70">Contact</span>
                                    <span className="cursor-pointer hover:opacity-70">About</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Website Content */}
                    <div className="flex h-full w-full flex-col items-center justify-start overflow-hidden bg-[#E5E3DE] p-4 pt-8 select-none">
                        {/* Hero Content */}
                        <div className="text-center text-[#3C342F]">
                            <h1 className="mb-3 font-serif text-xl">Le Fidgette</h1>
                            <p className="mb-6 text-xs text-balance opacity-90">
                                Creating natural shapes inspired by the natural world.
                            </p>
                        </div>

                        {/* "View Work" Button */}
                        <div className="hover:bg-opacity-90 mb-12 w-24 cursor-pointer bg-[#8E837D] p-2 text-center transition-opacity">
                            <p className="text-[10px] font-medium tracking-wider text-white">
                                VIEW WORK
                            </p>
                        </div>
                        {/* Three-column minimalist text */}
                        <div
                            className={`grid w-full text-[#3C342F] ${isMobileWidth ? 'grid-cols-1 gap-4' : 'max-w-120 grid-cols-3 gap-8'}`}
                        >
                            <div className={`${isMobileWidth ? 'text-center' : 'text-left'}`}>
                                <div className="mb-2 h-4 w-4 bg-[#D1CFC9]"></div>
                                <h3 className="mb-1 font-serif text-xs font-semibold">
                                    Artisanal Quality
                                </h3>
                                <p className="text-[11px] opacity-80">Hand-thrown with passion.</p>
                            </div>
                            <div className={`${isMobileWidth ? 'text-center' : 'text-left'}`}>
                                <div className="mb-2 h-4 w-4 bg-[#D1CFC9]"></div>
                                <h3 className="mb-1 font-serif text-xs font-semibold">
                                    Earthy Tones
                                </h3>
                                <p className="text-[11px] opacity-80">
                                    Inspired by nature's palette.
                                </p>
                            </div>
                            <div className={`${isMobileWidth ? 'text-center' : 'text-left'}`}>
                                <div className="mb-2 h-4 w-4 bg-[#D1CFC9]"></div>
                                <h3 className="mb-1 font-serif text-xs font-semibold">
                                    Lasting Beauty
                                </h3>
                                <p className="text-[11px] opacity-80">
                                    Functional art for your home.
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Responsive Handles */}
                    <div
                        className="group absolute top-1/2 left-[-16px] -m-4 -translate-y-1/2 transform cursor-ew-resize p-4 py-20"
                        onMouseDown={(e) => handleMouseDown(e, 'left')}
                    >
                        <div className="h-20 w-1.5 rounded-full bg-gray-400 shadow-lg transition-colors duration-200 group-hover:bg-gray-500"></div>
                    </div>
                    <div
                        className="group absolute top-1/2 right-[-16px] -m-4 -translate-y-1/2 transform cursor-ew-resize p-4 py-20"
                        onMouseDown={(e) => handleMouseDown(e, 'right')}
                    >
                        <div className="h-20 w-1.5 rounded-full bg-gray-400 shadow-lg transition-colors duration-200 group-hover:bg-gray-500"></div>
                    </div>
                </div>
            </div>

            <div className="flex w-full flex-row items-start gap-8">
                {/* Icon + Title */}
                <div className="flex w-1/2 flex-col items-start">
                    <div className="mb-2">
                        <Laptop className="text-foreground-primary h-6 w-6" />
                    </div>
                    <span className="text-foreground-primary text-largePlus font-light">
                        Instantly responsive
                    </span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular w-1/2 text-balance">
                    Craft sites that look great on laptops, tablets, and phones with minimal
                    adjustments.
                </p>
            </div>
        </div>
    );
}
