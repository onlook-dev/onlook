import React from 'react';

export function BuilderFeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Works With Your Codebase
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    Connect Your Existing Project. Start Designing in Minutes.
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    No rebuilding. No migration. Connect your React, Next.js, or Vue project and design with your real components — the ones your engineers already built.
                </p>
            </div>
        </div>
    );
}
