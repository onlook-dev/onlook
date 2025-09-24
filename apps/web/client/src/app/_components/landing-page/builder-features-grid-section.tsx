import React from 'react';

export function BuilderFeaturesGridSection() {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-16">
            <div className="grid grid-cols-1 gap-x-16 gap-y-20 md:grid-cols-3">
                <div>
                    <h3 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Live Code Editing
                    </h3>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Make visual changes that instantly update your React files with proper TSX,
                        props, and state management
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Layer Management
                    </h3>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Navigate and organize your app's structure through an intuitive layers panel
                        for precise element selection and editing
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Component Library Integration
                    </h3>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Use your existing React component library or import any next/tailwind kit
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        TailwindCSS Visual Editor
                    </h3>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Visually edit and apply Tailwind classes with auto-completion and real-time
                        styling previews
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Responsive Design Tools
                    </h3>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Build mobile-first React apps with breakpoint previews and automatic media
                        query generation
                    </p>
                </div>

                <div>
                    <h3 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Import Templates
                    </h3>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Start with any Next.js/Tailwind template and let AI understand your patterns
                        to generate matching components
                    </p>
                </div>
            </div>
        </div>
    );
}
