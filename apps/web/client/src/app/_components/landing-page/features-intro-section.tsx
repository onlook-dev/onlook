import React from 'react';

export function FeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Complete React Visual Builder
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    All the Features you need to Build and Scale
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    Get the best of visual design with developer-grade features. Build complex React applications visually while maintaining full control over your code, components, and architecture – No refactoring required.
                </p>
            </div>
        </div>
    );
}
