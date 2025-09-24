'use client';

import React from 'react';

import { useGitHubStats } from '../top-bar/github';

export function SocialProofSection() {
    const { formatted: starCount, contributors } = useGitHubStats();

    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-16">
            <div className="text-center">
                <h2 className="text-foreground-primary mb-8 text-2xl font-light">
                    Community Stats:
                </h2>
                <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
                    <div>
                        <div className="text-foreground-primary mb-2 text-2xl font-light">
                            {starCount}+
                        </div>
                        <div className="text-foreground-secondary text-regular">GitHub stars</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary mb-2 text-2xl font-light">
                            {contributors}+
                        </div>
                        <div className="text-foreground-secondary text-regular">contributors</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary mb-2 text-2xl font-light">
                            YC W25
                        </div>
                        <div className="text-foreground-secondary text-regular">backed</div>
                    </div>
                    <div>
                        <div className="text-foreground-primary mb-2 text-2xl font-light">
                            Open source
                        </div>
                        <div className="text-foreground-secondary text-regular">
                            &amp; transparent
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
