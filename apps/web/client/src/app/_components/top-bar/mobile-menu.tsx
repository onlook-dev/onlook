'use client';

import { ExternalRoutes, Routes } from '@/utils/constants';
import { ABOUT_LINKS, PRODUCT_LINKS, RESOURCES_LINKS } from '@/utils/constants/navigation';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileMenuContent({ isOpen, onClose }: MobileMenuProps) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);

    const toggleCategory = (categoryTitle: string) => {
        setExpandedCategory(expandedCategory === categoryTitle ? null : categoryTitle);
    };

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            // Prevent body scroll when menu is open
            document.body.style.overflow = 'hidden';
            // Small delay to ensure DOM is ready before animating
            const timer = setTimeout(() => {
                setShouldAnimate(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setShouldAnimate(false);
            // Restore body scroll
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleTransitionEnd = () => {
        if (!isOpen) {
            setIsRendered(false);
        }
    };

    if (!isRendered) return null;

    return (
        <>
            {/* Backdrop - portal to body to escape height constraints */}
            {typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed left-0 right-0 bottom-0 bg-black md:hidden"
                    style={{
                        top: '3rem',
                        zIndex: 50,
                        opacity: shouldAnimate ? 0.6 : 0,
                        transition: 'opacity 250ms ease-out',
                        pointerEvents: shouldAnimate ? 'auto' : 'none'
                    }}
                    onClick={onClose}
                />,
                document.body
            )}

            {/* Menu Panel - also portal to body */}
            {typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed left-0 right-0 bg-background border-b border-border shadow-lg md:hidden overflow-y-auto"
                    style={{
                        top: '3rem',
                        maxHeight: 'calc(100vh - 3rem)',
                        zIndex: 50,
                        pointerEvents: 'auto',
                        transform: shouldAnimate ? 'translateY(0)' : 'translateY(-1rem)',
                        opacity: shouldAnimate ? 1 : 0,
                        transition: 'transform 250ms ease-out, opacity 250ms ease-out'
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                {/* Product Section */}
                <div className="border-b border-border">
                <button
                    onClick={() => toggleCategory('Product')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-foreground/5"
                >
                    <span className="text-regular text-foreground-primary">Product</span>
                    <Icons.ChevronDown
                        className={cn(
                            'w-5 h-5 text-foreground-secondary transition-transform duration-200',
                            expandedCategory === 'Product' && 'rotate-180',
                        )}
                    />
                </button>
                    
                    <div className={cn(
                        "bg-foreground/5 transition-all duration-200 ease-out overflow-hidden",
                        expandedCategory === 'Product' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                        {PRODUCT_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className="block p-4 pl-8 hover:bg-foreground/10"
                                {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                            >
                                <div className="text-sm text-foreground-primary font-medium">{link.title}</div>
                                <div className="text-xs text-foreground-secondary mt-0.5">{link.description}</div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Resources Section */}
                <div className="border-b border-border">
                <button
                    onClick={() => toggleCategory('Resources')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-foreground/5"
                >
                    <span className="text-regular text-foreground-primary">Resources</span>
                    <Icons.ChevronDown
                        className={cn(
                            'w-5 h-5 text-foreground-secondary transition-transform duration-200',
                            expandedCategory === 'Resources' && 'rotate-180',
                        )}
                    />
                </button>
                    
                    <div className={cn(
                        "bg-foreground/5 transition-all duration-200 ease-out overflow-hidden",
                        expandedCategory === 'Resources' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                        {RESOURCES_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className="block p-4 pl-8 hover:bg-foreground/10"
                                {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                            >
                                <div className="text-sm text-foreground-primary font-medium">{link.title}</div>
                                <div className="text-xs text-foreground-secondary mt-0.5">{link.description}</div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* About Section */}
                <div className="border-b border-border">
                <button
                    onClick={() => toggleCategory('About')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-foreground/5"
                >
                    <span className="text-regular text-foreground-primary">About</span>
                    <Icons.ChevronDown
                        className={cn(
                            'w-5 h-5 text-foreground-secondary transition-transform duration-200',
                            expandedCategory === 'About' && 'rotate-180',
                        )}
                    />
                </button>
                    
                    <div className={cn(
                        "bg-foreground/5 transition-all duration-200 ease-out overflow-hidden",
                        expandedCategory === 'About' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                        {ABOUT_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={onClose}
                                className="block p-4 pl-8 hover:bg-foreground/10"
                                {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                            >
                                <div className="text-sm text-foreground-primary font-medium">{link.title}</div>
                                <div className="text-xs text-foreground-secondary mt-0.5">{link.description}</div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="p-4">
                    <a
                        href={ExternalRoutes.BOOK_DEMO}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className="block w-full bg-foreground-primary text-background text-center py-3 px-4 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Book a Demo
                    </a>
                </div>
            </div>,
                document.body
            )}
        </>
    );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="md:hidden text-foreground-secondary hover:opacity-80 p-3 flex items-center justify-center"
            aria-label="Open menu"
        >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
    );
}