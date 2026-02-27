import React from 'react';

export function FeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Native Design Tool Features
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    Familiar to Designers. Trusted by Engineers.
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    A canvas that feels intuitive, with real code underneath. Engineers can merge what you create directly — no handoff, no rebuilding.
                </p>
            </div>
        </div>
    );
}
