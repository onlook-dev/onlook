'use client';

import React from 'react';
import { Button } from '@onlook/ui/button';
import { useRouter } from 'next/navigation';

interface EnhancedCTASectionProps {
    href?: string;
    onClick?: () => void;
    ctaText?: string;
    buttonText?: string;
    description?: string;
}

export function EnhancedCTASection({ 
    href, 
    onClick, 
    ctaText = "Start Building with Onlook Today", 
    buttonText = "Get Started for Free",
    description = "Join thousands of developers and designers creating efficient, scalable React applications with Onlook's visual builder—combining the power of code with intuitive visual tools."
}: EnhancedCTASectionProps = {}) {
    const router = useRouter();

    const handleGetStartedClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            if (href.startsWith('http')) {
                window.open(href, '_blank', 'noopener,noreferrer');
            } else {
                router.push(href);
            }
        } else {
            const heroSection = document.getElementById('hero');
            if (heroSection) {
                heroSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    };

    return (
        <section className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="flex flex-col items-center justify-center text-center">
                <h2 className="text-foreground-primary text-4xl lg:text-6xl font-light leading-tight mb-6 max-w-4xl">
                    {ctaText}
                </h2>
                <p className="text-foreground-secondary text-lg md:text-xl max-w-xl mx-auto mb-8 text-balance">
                    {description}
                </p>
                <Button 
                    variant="secondary" 
                    size="lg" 
                    className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-colors"
                    onClick={handleGetStartedClick}
                >
                    {buttonText}
                </Button>
            </div>
        </section>
    );
}
