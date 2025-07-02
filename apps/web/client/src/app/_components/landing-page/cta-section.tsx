'use client';

import { Button } from '@onlook/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CTASectionProps {
    href?: string;
    onClick?: () => void;
}

export function CTASection({ href, onClick }: CTASectionProps = {}) {
    const router = useRouter();

    const handleGetStartedClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            // Navigate to the specified href
            router.push(href);
        } else {
            // Default behavior: scroll to hero section on homepage
            const heroSection = document.getElementById('hero');
            if (heroSection) {
                heroSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    };

    const handleHomepageNavigation = () => {
        // Navigate to homepage with hash to trigger scroll to hero
        router.push('/');
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col items-right gap-24">
            <div className="flex-1 flex flex-col items-end justify-center text-right">
                <h2 className="text-foreground-primary text-6xl leading-[1.05] font-light mb-8 max-w-4xl text-balance">
                    Craft a website<br /> for free today
                </h2>
                <div className="flex flex-row items-center justify-end gap-3 w-full">
                    <Button 
                        variant="secondary" 
                        size="lg" 
                        className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-colors"
                        onClick={href === '/' ? handleHomepageNavigation : handleGetStartedClick}
                    >
                        Get Started
                    </Button>
                    <span className="text-foreground-tertiary text-regular text-left ml-0 ">
                        No credit card required.<br /> Cancel anytime.
                    </span>
                </div>
            </div>
        </div>
    );
} 