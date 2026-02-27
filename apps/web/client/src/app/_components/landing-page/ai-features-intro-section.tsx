import React from 'react';

export function AiFeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Design on an Infinite Canvas
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    Point at what you want. AI knows exactly what you mean.
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    No more describing "the button in the top right" — just click it. AI is constrained to your design system, so outputs stay on-brand every time.
                </p>
            </div>
        </div>
    );
}
