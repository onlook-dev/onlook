import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '@onlook/ui/icons';
import { Menu, Laptop } from 'lucide-react';

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
            <div className="w-full h-100 bg-[#2E2C2D] rounded-lg mb-6 relative overflow-hidden" ref={containerRef}>
                {/* Mini Website Container */}
                <div 
                    className="h-80 bg-[#E5E3DE] rounded-lg border border-[#D1CFC9] shadow-lg absolute left-1/2 top-12 transform -translate-x-1/2"
                    style={{ width: `${websiteWidth}px` }}
                >
                    {/* Browser Header */}
                    <div className="w-full h-8 bg-[#E5E3DE] rounded-t-lg flex items-center justify-between px-3 select-none border-b border-[#D1CFC9]">
                        <div className="flex items-center gap-2">
                            <h2 className="font-serif text-xs text-[#3C342F] uppercase">Ceramix</h2>
                        </div>
                        <div className="flex items-center gap-4 text-[#3C342F] text-[10px]">
                            {isMobileWidth ? (
                                <Menu className="w-5 h-5 text-[#3C342F]" />
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
                    <div className="w-full h-full bg-[#E5E3DE] overflow-hidden select-none flex flex-col items-center justify-start p-4 pt-8">
                        {/* Hero Content */}
                        <div className="text-center text-[#3C342F]">
                            <h1 className="text-xl font-serif mb-3">Le Fidgette</h1>
                            <p className="text-xs opacity-90 mb-6 text-balance">Creating natural shapes inspired by the natural world.</p>
                        </div>
                        
                        {/* "View Work" Button */}
                        <div className="w-24 bg-[#8E837D] p-2 text-center cursor-pointer hover:bg-opacity-90 transition-opacity mb-12">
                            <p className="text-[10px] text-white font-medium tracking-wider">VIEW WORK</p>
                        </div>
                        {/* Three-column minimalist text */}
                        <div className={`grid w-full text-[#3C342F] ${isMobileWidth ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-8 max-w-120'}`}>
                            <div className={`${isMobileWidth ? 'text-center' : 'text-left'}`}>
                                <div className="w-4 h-4 bg-[#D1CFC9] mb-2"></div>
                                <h3 className="font-serif text-xs font-semibold mb-1">Artisanal Quality</h3>
                                <p className="text-[11px] opacity-80">Hand-thrown with passion.</p>
                            </div>
                            <div className={`${isMobileWidth ? 'text-center' : 'text-left'}`}>
                                <div className="w-4 h-4 bg-[#D1CFC9] mb-2"></div>
                                <h3 className="font-serif text-xs font-semibold mb-1">Earthy Tones</h3>
                                <p className="text-[11px] opacity-80">Inspired by nature's palette.</p>
                            </div>
                            <div className={`${isMobileWidth ? 'text-center' : 'text-left'}`}>
                                <div className="w-4 h-4 bg-[#D1CFC9] mb-2"></div>
                                <h3 className="font-serif text-xs font-semibold mb-1">Lasting Beauty</h3>
                                <p className="text-[11px] opacity-80">Functional art for your home.</p>
                            </div>
                        </div>
                    </div>
                    {/* Responsive Handles */}
                    <div 
                        className="absolute left-[-16px] top-1/2 transform -translate-y-1/2 p-4 py-20 -m-4 cursor-ew-resize group"
                        onMouseDown={(e) => handleMouseDown(e, 'left')}
                    >
                        <div className="w-1.5 h-20 bg-gray-400 group-hover:bg-gray-500 rounded-full transition-colors duration-200 shadow-lg"></div>
                    </div>
                    <div 
                        className="absolute right-[-16px] top-1/2 transform -translate-y-1/2 p-4 py-20 -m-4 cursor-ew-resize group"
                        onMouseDown={(e) => handleMouseDown(e, 'right')}
                    >
                        <div className="w-1.5 h-20 bg-gray-400 group-hover:bg-gray-500 rounded-full transition-colors duration-200 shadow-lg"></div>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-row items-start gap-8 w-full">
                {/* Icon + Title */}
                <div className="flex flex-col items-start w-1/2">
                    <div className="mb-2">
                        <Laptop className="w-6 h-6 text-foreground-primary" />
                    </div>
                    <span className="text-foreground-primary text-largePlus font-light">Instantly responsive</span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular text-balance w-1/2">
                    Craft sites that look great on laptops, tablets, and phones with minimal adjustments.
                </p>
            </div>
        </div>
    );
} 