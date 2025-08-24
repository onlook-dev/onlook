'use client';

import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { ButtonLink } from '../button-link';
import { AiChatInteractive } from '../shared/mockups/ai-chat-interactive';
import { DirectEditingInteractive } from '../shared/mockups/direct-editing-interactive';
import { TailwindColorEditorMockup } from '../shared/mockups/tailwind-color-editor';

export function BenefitsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 lg:py-64 px-8">
            <div className="space-y-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Visual React Editing for Developers</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Edit React Apps Visually with Code Sync</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Manipulate your React codebase visually while seeing real-time code changes. No more switching between editor and browser. Build, style, and refactor your react app with pixel-perfect control and automatic code generation.
                        </p>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">No-Code React Builder with Developer Tools</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Create Complex React UIs Without Writing Every Line</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Use drag-and-drop for layouts, components, and state management while Onlook generates production-ready React code.
                        </p>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">AI-Assisted React Development</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Generate and Refine React Code with AI</p>
                        <p className="text-foreground-secondary text-regular mb-6 text-balance max-w-xl">
                            Combine visual building with AI prompts to create custom React components, hooks, and patterns that match your project's architecture, ensuring everything is typed, optimized, and ready for production.
                        </p>
                        <div className="grid grid-cols-2 gap-8 mb-8 text-foreground-secondary text-regular">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Auto Layout & Flexbox</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Borders</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Margins</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Image backgrounds</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Typography</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Padding</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Gradients</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Corner Radii</span>
                                </div>
                            </div>
                        </div>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="w-full h-100 rounded-lg order-1 lg:order-2">
                        <TailwindColorEditorMockup />
                    </div>
                </div>
            </div>
        </div>
    );
}
