import React from 'react';

export function BuilderFeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-16 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Live Code Editing</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Make visual changes that instantly update your React files with proper TSX, props, and state management</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Layer Management</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Navigate and organize your app's structure through an intuitive layers panel for precise element selection and editing</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Component Library Integration</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Use your existing React component library or import any next/tailwind kit</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">TailwindCSS Visual Editor</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Visually edit and apply Tailwind classes with auto-completion and real-time styling previews</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Responsive Design Tools</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Build mobile-first React apps with breakpoint previews and automatic media query generation</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Import Templates</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Start with any Next.js/Tailwind template and let AI understand your patterns to generate matching components</p>
                </div>
            </div>
        </div>
    );
}
