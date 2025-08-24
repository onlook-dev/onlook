import React from 'react';

export function FeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Complete Design System Management
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    All the Tools to Create and Maintain Consistent Branding
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    Build and scale professional design systems with visual tools for Tailwind, Shadcn, components, and templates. Brand consistency across your React applications while supporting both developers and designers.
                </p>
            </div>
        </div>
    );
}
