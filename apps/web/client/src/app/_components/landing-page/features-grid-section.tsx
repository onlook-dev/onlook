import React from 'react';

export function FeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-primary text-regularPlus mb-2 text-balance">Component Library</h3>
                    <h4 className="text-foreground-primary text-lg font-medium mb-4">Components that scale</h4>
                    <p className="text-foreground-secondary text-regular text-balance">
                        Create reusable components that work across your project. Build once, use everywhere. Components maintain their style and behavior while giving you control of content.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-regularPlus mb-2 text-balance">Theming &amp; Branding</h3>
                    <h4 className="text-foreground-primary text-lg font-medium mb-4">Your brand, your rules</h4>
                    <p className="text-foreground-secondary text-regular text-balance">
                        Manage color palettes, typography scales, and design tokens through a centralized system. Define your design language once, apply it consistently across your project.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-regularPlus mb-2 text-balance">Layer Management</h3>
                    <h4 className="text-foreground-primary text-lg font-medium mb-4">Precise control over every element</h4>
                    <p className="text-foreground-secondary text-regular text-balance">
                        Navigate your React component tree through a visual layer panel. Select, organize, and control components with precision. No more hunting through JSX to find the element you want to edit.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-regularPlus mb-2 text-balance">Version History</h3>
                    <h4 className="text-foreground-primary text-lg font-medium mb-4">Auto save, history and version control</h4>
                    <p className="text-foreground-secondary text-regular text-balance">
                        Roll-back anytime! Onlook automatically saves project snapshots so you can experiment with confidence.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-regularPlus mb-2 text-balance">React Templates</h3>
                    <h4 className="text-foreground-primary text-lg font-medium mb-4">Bring your own projects into Onlook or start fresh</h4>
                    <p className="text-foreground-secondary text-regular text-balance">
                        Onlook works with any React next.js website styled with Tailwind. Import your existing codebase and start editing visually, or begin with a new project.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-regularPlus mb-2 text-balance">Open Source</h3>
                    <h4 className="text-foreground-primary text-lg font-medium mb-4">Transparent by Design</h4>
                    <p className="text-foreground-secondary text-regular text-balance">
                        Browse our GitHub repo to understand how Onlook works, contribute improvements, or customize it for your team's needs.
                    </p>
                </div>
            </div>
        </div>
    );
}
