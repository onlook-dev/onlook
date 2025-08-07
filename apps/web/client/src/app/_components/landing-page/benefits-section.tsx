import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { ButtonLink } from '../button-link';

export function BenefitsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="space-y-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col">
                        <h3 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">AI-Powered Visual Builder</h3>
                        <h2 className="text-foreground-primary text-4xl font-light mb-6">AI for UI design</h2>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance">
                            Prompt Onlook's AI to build, design, and experiment with your ideas. Go beyond pretty pixels and make your frontend interactive. The AI understands your React components and Tailwind patterns, generating code that fits your project's architecture.
                        </p>
                        <div className="self-start">
                            <ButtonLink href="/ai" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>
                                Learn more
                            </ButtonLink>
                        </div>
                    </div>
                    <div className="flex items-center justify-center bg-background-secondary rounded-lg aspect-video">
                        <div className="text-foreground-tertiary text-lg">Image Placeholder</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col">
                        <h3 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">React Visual Editor</h3>
                        <h2 className="text-foreground-primary text-4xl font-light mb-6">Build Your App Visually</h2>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance">
                            Edit React components directly in the browser. Drag, drop, and style elements visually while Onlook updates your actual code files in real-time.
                            Your existing build process stays intact. Onlook works with your setup, not against it.
                        </p>
                        <div className="self-start">
                            <ButtonLink href="/builder" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>
                                Learn more
                            </ButtonLink>
                        </div>
                    </div>
                    <div className="flex items-center justify-center bg-background-secondary rounded-lg aspect-video">
                        <div className="text-foreground-tertiary text-lg">Image Placeholder</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col">
                        <h3 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Tailwind CSS Visual Editor</h3>
                        <h2 className="text-foreground-primary text-4xl font-light mb-6">Style Without Writing CSS</h2>
                        <p className="text-foreground-secondary text-regular mb-6 text-balance">
                            Adjust layouts, change colors, modify text, and more. Onlook generates clean Tailwind classes that match your design decisions.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-foreground-secondary text-sm">
                            <div>• Auto Layout</div>
                            <div>• Typography</div>
                            <div>• Borders</div>
                            <div>• Padding</div>
                            <div>• Margins</div>
                            <div>• Gradients</div>
                            <div>• More...</div>
                        </div>
                        <div className="self-start">
                            <ButtonLink href="/design-system" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>
                                Learn more
                            </ButtonLink>
                        </div>
                    </div>
                    <div className="flex items-center justify-center bg-background-secondary rounded-lg aspect-video">
                        <div className="text-foreground-tertiary text-lg">Image Placeholder</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
