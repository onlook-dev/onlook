import React from 'react';

export function FeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Asset Management</h3>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Upload, organize, and optimize images, icons, and media assets with built-in tools for cropping, formatting, and automatic application throughout your project
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">1-Click Publish</h3>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Deploy your entire design system or individual changes instantly to GitHub, or live environments with automatic versioning and backups
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Component Import</h3>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Easily import existing React components or third-party libraries with automatic integration, visual previews, and seamless adaptation to your design system
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Gradient Picker</h3>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Create and apply complex gradients visually with intuitive controls, color stops, and real-time previews that integrate directly into your global styles
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">AI Animations</h3>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Generate intelligent animations and transitions using AI, with visual timeline editing, keyframe suggestions, and automatic optimization for performance
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Layer Management</h3>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Navigate and organize your app's structure through an intuitive layers panel for precise element selection, grouping, and editing across complex designs
                    </p>
                </div>
            </div>
        </div>
    );
}
