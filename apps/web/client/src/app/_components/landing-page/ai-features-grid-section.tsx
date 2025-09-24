import React from 'react';

export function AiFeaturesGridSection() {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-32">
            <div className="grid grid-cols-1 gap-x-16 gap-y-20 md:grid-cols-3">
                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Instant Visual Feedback
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        See AI-generated components appear in real-time
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        See AI-generated components appear in real-time as you describe them, with
                        immediate visual updates for every change you make
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Component Library
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        AI automatically creates reusable components
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        AI automatically creates reusable components from your designs and suggests
                        smart combinations from your existing library
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Global Styles
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Define your brand colors, fonts, and spacing once
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Define your brand colors, fonts, and spacing once - AI applies them
                        consistently across every component it generates
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Responsive Breakpoints
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        AI builds mobile-first components
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        AI builds mobile-first components that automatically adapt to any screen
                        size with proper breakpoints and fluid layouts
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Layer Management
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Navigate your app structure through an intuitive layer panel
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Navigate your app structure through an intuitive layer panel - select any
                        element to edit manually or collaborate with AI
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Import Templates
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Start with any Next.js/Tailwind template
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Start with any Next.js/Tailwind template and let AI understand your patterns
                        to generate matching components
                    </p>
                </div>
            </div>
        </div>
    );
}
