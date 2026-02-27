import React from 'react';

export function FeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Your Real Components</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Design with what engineers built</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Use the buttons, cards, and layouts your team already created. Not generic HTML — your actual design system, ready to drag onto the canvas.
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Built for Teams</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Real-time collaboration</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Share your canvas. Leave spatial comments. Work together on designs that become real PRs. No more "now how do I share this?"
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Ship PRs, Not Prototypes</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Changes become pull requests</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Your changes become a real pull request. Engineers review and merge — no handoff, no translation, no rebuilding from specs.
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Layer Management</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Navigate your component tree</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        See your React component hierarchy in a visual layer panel. Click any layer to select it on the canvas. No more hunting through JSX.
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Works With Your Codebase</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Connect existing projects</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Connect your existing React or Next.js project. No rebuilding. No migration. Start designing in minutes.
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Version History</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Never lose your progress</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Onlook automatically saves project snapshots. Experiment with confidence — roll back to any previous version with one click.
                    </p>
                </div>
            </div>
        </div>
    );
}
