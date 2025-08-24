import React from 'react';

export function AiFeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Instant Visual Feedback</h2>
                    <p className="text-foreground-secondary text-small uppercase tracking-wider mb-4">See AI-generated components appear in real-time</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        See AI-generated components appear in real-time as you describe them, with immediate visual updates for every change you make
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Component Library</h2>
                    <p className="text-foreground-secondary text-small uppercase tracking-wider mb-4">AI automatically creates reusable components</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        AI automatically creates reusable components from your designs and suggests smart combinations from your existing library
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Global Styles</h2>
                    <p className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Define your brand colors, fonts, and spacing once</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Define your brand colors, fonts, and spacing once - AI applies them consistently across every component it generates
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Responsive Breakpoints</h2>
                    <p className="text-foreground-secondary text-small uppercase tracking-wider mb-4">AI builds mobile-first components</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        AI builds mobile-first components that automatically adapt to any screen size with proper breakpoints and fluid layouts
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Layer Management</h2>
                    <p className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Navigate your app structure through an intuitive layer panel</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Navigate your app structure through an intuitive layer panel - select any element to edit manually or collaborate with AI
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Import Templates</h2>
                    <p className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Start with any Next.js/Tailwind template</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Start with any Next.js/Tailwind template and let AI understand your patterns to generate matching components
                    </p>
                </div>
            </div>
        </div>
    );
}
