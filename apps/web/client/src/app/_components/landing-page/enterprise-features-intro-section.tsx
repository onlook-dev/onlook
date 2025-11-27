import React from 'react';

export function EnterpriseFeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Enterprise Visual Editor
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    Framework-Agnostic Design That Works with Your Codebase
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    Onlook works with your existing components, frameworks, and architecture. Designers ship changes directly to your codebase—no handoff, no translation errors. Built for teams that need to move fast without compromising on code quality.
                </p>
            </div>
        </div>
    );
}

