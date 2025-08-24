import React from 'react';
import type { FeatureItem } from '@/content/types';

interface FeaturesGridSectionProps {
    features?: FeatureItem[];
}

export function FeaturesGridSection({ features }: FeaturesGridSectionProps) {
    const defaultFeatures: FeatureItem[] = [
        {
            subtitle: "Component Library",
            title: "Unified components for design and code",
            description: "Create reusable components that work across your project. Build once, use everywhere. Components maintain their style and behavior while giving you control of content."
        },
        {
            subtitle: "Theming & Branding",
            title: "Centralized Design & Style Management",
            description: "Manage color palettes, typography scales, and design tokens through a centralized system. Define your design language once, apply it consistently across your project."
        },
        {
            subtitle: "Layer Management",
            title: "Precise control over every element",
            description: "Navigate your React component tree through a visual layer panel. Select, organize, and control components with precision. No more hunting through JSX to find the element you want to edit."
        },
        {
            subtitle: "Version History",
            title: "Auto save, history and version control",
            description: "Roll-back anytime! Onlook automatically saves project snapshots so you can experiment with confidence."
        },
        {
            subtitle: "React Templates",
            title: "Bring your own projects into Onlook or start fresh",
            description: "Onlook works with any React next.js website styled with Tailwind. Import your existing codebase and start editing visually, or begin with a new project."
        },
        {
            subtitle: "Open Source",
            title: "Built with the Community",
            description: "Browse our GitHub repo to understand how Onlook works, contribute improvements, or customize it for your team's needs."
        }
    ];

    const featureItems = features || defaultFeatures;

    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                {featureItems.map((feature, index) => (
                    <div key={index}>
                        <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">{feature.subtitle}</h3>
                        <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">{feature.title}</h2>
                        <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                            {feature.subtitle === "Open Source" ? (
                                <>
                                    <a href="https://github.com/Onlook/Onlook-dev" target="_blank" rel="noopener noreferrer" className="underline">Browse our GitHub repo</a> to understand how Onlook works, contribute improvements, or customize it for your team's needs.
                                </>
                            ) : (
                                feature.description
                            )}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
