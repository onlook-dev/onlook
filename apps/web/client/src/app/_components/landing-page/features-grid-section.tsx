import React from 'react';

export function FeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Component Library</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Unified components for design and code</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Create reusable components that work across your project. Build once, use everywhere. Components maintain their style and behavior while giving you control of content.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Theming &amp; Branding</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Centralized Design &amp; Style Management</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Manage color palettes, typography scales, and design tokens through a centralized system. Define your design language once, apply it consistently across your project.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Layer Management</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Precise control over every element</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Navigate your React component tree through a visual layer panel. Select, organize, and control components with precision. No more hunting through JSX to find the element you want to edit.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Version History</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Auto save, history and version control</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Roll-back anytime! Onlook automatically saves project snapshots so you can experiment with confidence.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">React Templates</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Bring your own projects into Onlook or start fresh</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Onlook works with any React next.js website styled with Tailwind. Import your existing codebase and start editing visually, or begin with a new project.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Open Source</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Built with the Community</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        <a href="https://github.com/Onlook/Onlook-dev" target="_blank" rel="noopener noreferrer" className="underline">Browse our GitHub repo</a> to understand how Onlook works, contribute improvements, or customize it for your team's needs.
                    </p>
                </div>
            </div>
        </div>
    );
}
