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
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Tailwind CSS and Shadcn Visual Editor</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Style Tailwind and Shadcn Components Visually</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Visually customize Tailwind classes and Shadcn UI components with auto-completion, real-time previews, and drag-and-drop editing, ensuring your design system stays consistent while accelerating UI development.
                        </p>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Centralized Globals for Color and Typography</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Manage Brand Styles from One Place</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Define and edit global colors, typography, and design tokens in a centralized panel—Onlook automatically applies changes across your entire React app, eliminating inconsistencies and saving hours of manual updates.
                        </p>
                        {/* Removed hidden CTA to avoid unused icon JSX in this client file */}
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Template Import and Customization</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Import and Adapt Any Next.js/Tailwind Project</p>
                        <p className="text-foreground-secondary text-regular mb-6 text-balance max-w-xl">
                            Easily import your own or third-party Next.js/Tailwind templates, then customize them visually—Onlook preserves the original structure while allowing drag-and-drop modifications and AI-assisted refinements for rapid prototyping and scaling.
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
