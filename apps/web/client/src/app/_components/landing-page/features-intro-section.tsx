import React from 'react';

export function FeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Complete React Visual Builder
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    All the Tools to Build and Scale Your Apps
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    Everything You Need for Fast Product Validation. Generate, test, and iterate on product ideas with AI-powered prototyping tools. Create functional React prototypes that help you validate concepts, gather feedback, and make data-driven product decisions faster than ever.
                </p>
            </div>
        </div>
    );
}
