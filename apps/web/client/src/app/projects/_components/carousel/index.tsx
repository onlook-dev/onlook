'use client';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface CarouselProps {
    children: ReactNode;
    gap?: string;
    className?: string;
    scrollAmount?: number;
    tolerance?: number;
}

const SCROLL_AMOUNT = 300;
const SCROLL_TOLERANCE = 10;

export function Carousel({
    children,
    gap = 'gap-4',
    className,
    scrollAmount = SCROLL_AMOUNT,
    tolerance = SCROLL_TOLERANCE,
}: CarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftButton, setShowLeftButton] = useState(false);
    const [showRightButton, setShowRightButton] = useState(false);

    // Check overflow and handle scroll position
    useEffect(() => {
        const checkOverflow = () => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                const hasOverflow = scrollWidth > clientWidth;
                const isAtEnd = scrollLeft + clientWidth >= scrollWidth - tolerance;

                setShowLeftButton(scrollLeft > tolerance);
                setShowRightButton(hasOverflow && !isAtEnd);
            }
        };

        const handleScroll = () => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

                setShowLeftButton(scrollLeft > tolerance);

                const isAtEnd = scrollLeft + clientWidth >= scrollWidth - tolerance;
                setShowRightButton(!isAtEnd && scrollWidth > clientWidth);
            }
        };

        const scrollContainer = scrollRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', checkOverflow);

            // Initial check
            checkOverflow();

            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', checkOverflow);
            };
        }
    }, [tolerance, children]);

    const scrollLeft = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className="relative overflow-x-visible">
            {/* Left gradient - only visible when scrolled */}
            <AnimatePresence>
                {showLeftButton && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"
                    />
                )}
            </AnimatePresence>

            {/* Right gradient - only visible when not at end */}
            <AnimatePresence>
                {showRightButton && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"
                    />
                )}
            </AnimatePresence>

            {/* Left scroll button */}
            <AnimatePresence>
                {showLeftButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollLeft}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-secondary transition-colors flex items-center justify-center text-foreground-secondary hover:text-foreground"
                        aria-label="Scroll left"
                    >
                        <Icons.ChevronRight className="w-5 h-5 rotate-180" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Right scroll button */}
            <AnimatePresence>
                {showRightButton && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollRight}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-secondary transition-colors flex items-center justify-center text-foreground-secondary hover:text-foreground"
                        aria-label="Scroll right"
                    >
                        <Icons.ChevronRight className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Scrollable content */}
            <div
                ref={scrollRef}
                className={cn(
                    'flex overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]',
                    gap,
                    className
                )}
            >
                {children}
            </div>
        </div>
    );
}
