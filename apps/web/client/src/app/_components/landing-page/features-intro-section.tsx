import React from 'react';

export function FeaturesIntroSection() {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-32 text-center">
            <div className="mx-auto max-w-3xl">
                <h2 className="text-foreground-secondary mb-6 text-sm font-medium tracking-wider uppercase">
                    Complete React Visual Builder
                </h2>
                <p className="text-foreground-primary mb-8 text-2xl leading-[1.1] font-light text-balance md:text-5xl">
                    All the Features you need to Build and Scale
                </p>
                <p className="text-foreground-secondary mx-auto max-w-xl text-lg text-balance">
                    Get the best of visual design with developer-grade features. Build complex React
                    applications visually while maintaining full control over your code, components,
                    and architecture – No refactoring required.
                </p>
            </div>
        </div>
    );
}
