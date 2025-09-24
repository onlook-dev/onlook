import React from 'react';

import { Icons } from '@onlook/ui/icons';

import { AiChatInteractive } from '../shared/mockups/ai-chat-interactive';
import { ComponentsMockup } from '../shared/mockups/components-mockup';
import { TailwindColorEditorMockup } from '../shared/mockups/tailwind-color-editor';

export function BuilderBenefitsSection() {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-32 lg:py-64">
            <div className="space-y-24">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            Visual React Editing for Developers
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Edit React Apps Visually with Code Sync
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Manipulate your React codebase visually while seeing real-time code
                            changes. No more switching between editor and browser. Build, style, and
                            refactor your react app with pixel-perfect control and automatic code
                            generation.
                        </p>
                    </div>
                    <div className="order-1 h-100 w-full rounded-lg lg:order-2">
                        <TailwindColorEditorMockup />
                    </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            No-Code React Builder with Developer Tools
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Create Complex React UIs Without Writing Every Line
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Use drag-and-drop for layouts, components, and state management while
                            Onlook generates production-ready React code.
                        </p>
                    </div>
                    <div className="order-1 h-100 w-full rounded-lg lg:order-2">
                        <ComponentsMockup />
                    </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            AI-Assisted React Development
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Generate and Refine React Code with AI
                        </p>
                        <p className="text-foreground-secondary text-regular mb-6 max-w-xl text-balance">
                            Combine visual building with AI prompts to create custom React
                            components, hooks, and patterns that match your project's architecture,
                            ensuring everything is typed, optimized, and ready for production.
                        </p>
                        <div className="text-foreground-secondary text-regular mb-8 grid grid-cols-2 gap-8">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Component Generation</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>State Management</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Event Handlers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>API Integration</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>TypeScript Support</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Custom Hooks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Form Validation</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="h-5 w-5" />
                                    <span>Responsive Design</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>
            </div>
        </div>
    );
}
