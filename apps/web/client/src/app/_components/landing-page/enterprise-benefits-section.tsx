'use client';

import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { DirectEditingInteractive } from '../shared/mockups/direct-editing-interactive';
import { AiChatInteractive } from '../shared/mockups/ai-chat-interactive';
import { ComponentsBlock } from './feature-blocks/components';

export function EnterpriseBenefitsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 lg:py-64 px-8">
            <div className="space-y-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Framework Agnostic</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Works with Any Framework</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Onlook works with React, Vue, Angular, and any framework that renders to the DOM. No need to rebuild or migrate your existing components. Use your current component library exactly as it is.
                        </p>
                        <div className="grid grid-cols-2 gap-8 mb-8 text-foreground-secondary text-regular">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>React</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Vue</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Angular</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.CheckCircled className="w-5 h-5" />
                                    <span>Any DOM Framework</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Existing Components</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Use Your Component Library</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Import your existing codebase and start editing visually. Onlook works with components already in your codebase—no need to rebuild or recreate them. Your design system, component library, and architecture stay exactly as they are.
                        </p>
                        <div className="grid grid-cols-1 gap-4 mb-8 text-foreground-secondary text-regular">
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircled className="w-5 h-5" />
                                <span>Works with component-driven architectures</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircled className="w-5 h-5" />
                                <span>Integrates with existing design systems</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircled className="w-5 h-5" />
                                <span>No migration or refactoring required</span>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Designer Workflow</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Ship Changes Directly to Code</p>
                        <p className="text-foreground-secondary text-regular mb-6 text-balance max-w-xl">
                            Designers make changes in Onlook's visual editor, and those changes are written directly to your codebase. No handoff process, no translation errors, no lost-in-translation moments. What designers see is what gets shipped.
                        </p>
                        <div className="grid grid-cols-1 gap-4 mb-8 text-foreground-secondary text-regular">
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircled className="w-5 h-5" />
                                <span>Visual changes write to actual code files</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircled className="w-5 h-5" />
                                <span>No design-to-code translation step</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.CheckCircled className="w-5 h-5" />
                                <span>Changes go from design tool to production</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full order-1 lg:order-2">
                        <ComponentsBlock />
                    </div>
                </div>
            </div>
        </div>
    );
}

