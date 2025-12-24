'use client';

import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { ButtonLink } from '../button-link';
import { AiChatInteractive } from '../shared/mockups/ai-chat-interactive';
import { DirectEditingInteractive } from '../shared/mockups/direct-editing-interactive';
import { TailwindColorEditorMockup } from '../shared/mockups/tailwind-color-editor';

export function AiBenefitsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 lg:py-64 px-8">
            <div className="space-y-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">AI Code Generation for Designers</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Build Production-Ready Apps with Natural Language</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Describe what you want in plain text and watch AI create fully functional web applications with real databases, user authentication, and interactive features - not just static mockups or prototypes.
                        </p>
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Visual AI Design Tools</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Collaborate with AI on a Visual Canvas</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Select any element and choose to edit it yourself or work together with AI. Unlike pure chat-based tools, you maintain full visual control while AI assists with the heavy lifting, creating a seamless collaboration between human creativity and AI capability.
                        </p>
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">AI Design System Management</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Maintain Design System Consistency</p>
                        <p className="text-foreground-secondary text-regular mb-6 text-balance max-w-xl">
                            AI automatically applies your brand guidelines, component patterns, and design tokens to ensure every element stays on-brand and consistent across your entire application, eliminating design drift and maintaining professional polish.
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
                    </div>
                    <div className="w-full h-100 rounded-lg order-1 lg:order-2">
                        <TailwindColorEditorMockup />
                    </div>
                </div>
            </div>
        </div>
    );
}
