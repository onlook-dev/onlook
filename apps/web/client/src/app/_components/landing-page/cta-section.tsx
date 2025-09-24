'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@onlook/ui/button';

interface CTASectionProps {
    href?: string;
    onClick?: () => void;
    ctaText?: string;
    buttonText?: string;
    showSubtext?: boolean;
}

export function CTASection({
    href,
    onClick,
    ctaText = 'Craft a website\nfor free today',
    buttonText = 'Get Started',
    showSubtext = true,
}: CTASectionProps = {}) {
    const router = useRouter();

    const handleGetStartedClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            // Check if href is external (starts with http)
            if (href.startsWith('http')) {
                window.open(href, '_blank', 'noopener,noreferrer');
            } else {
                // Navigate to the specified href
                router.push(href);
            }
        } else {
            // Default behavior: scroll to hero section on homepage
            const heroSection = document.getElementById('hero');
            if (heroSection) {
                heroSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        }
    };

    const handleHomepageNavigation = () => {
        // Navigate to homepage with hash to trigger scroll to hero
        router.push('/');
    };

    return (
        <div className="items-right mx-auto flex w-full max-w-6xl flex-col gap-24 px-8 py-32">
            <div className="flex flex-1 flex-col items-end justify-center text-right">
                <h2 className="text-foreground-primary mb-8 max-w-4xl text-5xl leading-[1.05] font-light text-balance md:text-6xl">
                    {ctaText.split('\n').map((line, index) => (
                        <span key={index}>
                            {line}
                            {index < ctaText.split('\n').length - 1 && <br />}
                        </span>
                    ))}
                </h2>
                <div className="flex w-full flex-row items-center justify-end gap-3">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="hover:bg-foreground-primary hover:text-background-primary cursor-pointer p-6 transition-colors"
                        onClick={href === '/' ? handleHomepageNavigation : handleGetStartedClick}
                    >
                        {buttonText}
                    </Button>
                    {showSubtext && (
                        <span className="text-foreground-tertiary text-regular ml-0 text-left">
                            No credit card required.
                            <br /> Cancel anytime.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
