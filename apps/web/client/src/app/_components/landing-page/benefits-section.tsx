'use client';

import React from 'react';

import { Icons } from '@onlook/ui/icons';

import { ButtonLink } from '../button-link';
import { AiChatInteractive } from '../shared/mockups/ai-chat-interactive';
import { DirectEditingInteractive } from '../shared/mockups/direct-editing-interactive';
import { TailwindColorEditorMockup } from '../shared/mockups/tailwind-color-editor';

export function BenefitsSection() {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-32 lg:py-64">
            <div className="space-y-24">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            AI-Powered Visual Builder
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            AI for UI design
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Prompt Onlook's AI to build, design, and experiment with your ideas. Go
                            beyond pretty pixels and make your frontend interactive. The AI
                            understands your React components and Tailwind patterns, generating code
                            that fits your project's architecture.
                        </p>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            React Visual Editor
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Build Your App Visually
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Edit React components directly in the browser. Drag, drop, and style
                            elements visually while Onlook updates your actual code files in
                            real-time. Your existing build process stays intact. Onlook works with
                            your setup, not against it.
                        </p>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            Tailwind CSS Visual Editor
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Style Without Writing CSS
                        </p>
                        <p className="text-foreground-secondary text-regular mb-6 max-w-xl text-balance">
                            Adjust layouts, change colors, modify text, and more. Onlook generates
                            clean Tailwind classes that match your design decisions.
                        </p>
                        <div className="text-foreground-secondary text-regular mb-8 grid grid-cols-2 gap-8">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Auto Layout & Flexbox</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Borders</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Margins</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Image backgrounds</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Typography</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Padding</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Gradients</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Corner Radii</span>
                                </div>
                            </div>
                        </div>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 h-100 w-full rounded-lg lg:order-2">
                        <TailwindColorEditorMockup />
                    </div>
                </div>
            </div>
        </div>
    );
}
