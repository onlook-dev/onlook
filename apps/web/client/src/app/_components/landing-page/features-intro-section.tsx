import React from 'react';
import type { IntroContent } from '@/content/types';

interface FeaturesIntroSectionProps {
    intro?: IntroContent;
}

export function FeaturesIntroSection({ intro }: FeaturesIntroSectionProps) {
    const defaultIntro: IntroContent = {
        subtitle: "Complete React Visual Builder",
        title: "All the Features you need to Build and Scale"
    };

    const introContent = intro || defaultIntro;

    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h3 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    {introContent.subtitle}
                </h3>
                <h2 className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    {introContent.title}
                </h2>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    Get the best of visual design with developer-grade features. Build complex React applications visually while maintaining full control over your code, components, and architecture – No refactoring required.
                </p>
            </div>
        </div>
    );
}
