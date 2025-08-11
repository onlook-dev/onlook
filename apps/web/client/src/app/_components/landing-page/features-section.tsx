export function FeaturesSection() {
    return (
        <div className="w-full max-w-6xl mx-auto px-6 lg:px-8 mt-0">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
                {/* Left side - Headline */}
                <div className="flex-1">
                    <h1 className="text-4xl lg:text-5xl font-light text-foreground-primary leading-tight">
                        AI & <span className="font-['Vujahday_Script'] not-italic text-6xl">Design</span> – <br /> Side-by-Side
                    </h1>
                </div>
                
                {/* Right side - Subtitle */}
                <div className="flex-1 lg:text-right">
                    <p className="text-regular  lg:text-regular text-foreground-secondary leading-relaxed text-balance">
                        Craft and prototype real designs with the highest fidelity. Get into the flow-state in a workspace where everything can be used in-context with AI.
                    </p>
                </div>
            </div>
        </div>
    );
}
