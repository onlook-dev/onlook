import React from 'react';

import { OnlookInterfaceMockup } from './onlook-interface-mockup';

export function ResponsiveMockupSection() {
    return (
        <>
            {/* Desktop/Tablet View - Full Mockup */}
            <div
                className="flex hidden h-[44rem] w-screen items-center justify-center md:block"
                id="features"
            >
                <OnlookInterfaceMockup />
            </div>

            {/* Mobile View - Split into two sections */}
            <div className="md:hidden">
                {/* First Section - Right half of mockup (chat panel focused) */}
                <div
                    className="relative flex w-screen flex-col items-center justify-center overflow-hidden py-14"
                    id="features-mobile-1"
                >
                    {/* Original mockup positioned to show right side */}
                    <div className="absolute top-1/2 right-10 h-[800px] w-[1000px] -translate-y-1/2 transform">
                        <OnlookInterfaceMockup />
                    </div>

                    {/* Text section - positioned below mockup */}
                    <div className="mt-[700px] px-8 text-left">
                        <h2 className="text-foreground-primary mb-4 text-2xl leading-tight font-light text-balance md:text-4xl">
                            Design with AI on an infinite canvas
                        </h2>
                        <p className="text-large text-foreground-secondary leading-relaxed text-balance">
                            Craft, preview, and iterate with AI to ship better websites and
                            prototypes faster than ever.
                        </p>
                    </div>
                </div>

                {/* Second Section - Left half of mockup (layers/design tools focused) */}
                <div
                    className="relative flex w-screen flex-col items-center justify-center overflow-hidden py-14"
                    id="features-mobile-2"
                >
                    {/* Original mockup positioned to show left side */}
                    <div className="absolute top-1/2 left-10 h-[800px] w-[1000px] -translate-y-1/2 transform">
                        <OnlookInterfaceMockup />
                    </div>

                    {/* Text section - positioned below mockup */}
                    <div className="mt-[700px] px-8 text-left">
                        <h2 className="text-foreground-primary mb-4 text-2xl leading-tight font-light text-balance md:text-4xl">
                            Native design tool features that work 1:1 with code.
                        </h2>
                        <p className="text-large text-foreground-secondary leading-relaxed text-balance">
                            A true developer tool for designers, helping you code without knowing
                            anything about code.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
