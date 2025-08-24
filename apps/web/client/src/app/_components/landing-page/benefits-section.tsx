'use client';

import React from 'react';
import { Icons } from '@onlook/ui/icons';
import type { BenefitItem } from '@/content/types';
import { ButtonLink } from '../button-link';
import { AiChatInteractive } from '../shared/mockups/ai-chat-interactive';
import { DirectEditingInteractive } from '../shared/mockups/direct-editing-interactive';
import { TailwindColorEditorMockup } from '../shared/mockups/tailwind-color-editor';

interface BenefitsSectionProps {
    benefits?: BenefitItem[];
}

const mockupComponents = {
    AiChatInteractive,
    DirectEditingInteractive,
    TailwindColorEditorMockup
};

export function BenefitsSection({ benefits }: BenefitsSectionProps) {
    const defaultBenefits: BenefitItem[] = [
        {
            subtitle: "AI-Powered Visual Builder",
            title: "AI for UI design",
            description: "Prompt Onlook's AI to build, design, and experiment with your ideas. Go beyond pretty pixels and make your frontend interactive. The AI understands your React components and Tailwind patterns, generating code that fits your project's architecture.",
            mockupComponent: "AiChatInteractive"
        },
        {
            subtitle: "React Visual Editor",
            title: "Build Your App Visually",
            description: "Edit React components directly in the browser. Drag, drop, and style elements visually while Onlook updates your actual code files in real-time. Your existing build process stays intact. Onlook works with your setup, not against it.",
            mockupComponent: "DirectEditingInteractive"
        },
        {
            subtitle: "Tailwind CSS Visual Editor",
            title: "Style Without Writing CSS",
            description: "Adjust layouts, change colors, modify text, and more. Onlook generates clean Tailwind classes that match your design decisions.",
            mockupComponent: "TailwindColorEditorMockup"
        }
    ];

    const benefitItems = benefits || defaultBenefits;

    const renderMockup = (componentName: string) => {
        const Component = mockupComponents[componentName as keyof typeof mockupComponents];
        return Component ? <Component /> : null;
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-32 lg:py-64 px-8">
            <div className="space-y-24">
                {benefitItems.map((benefit, index) => (
                    <div key={index} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="flex flex-col order-2 lg:order-1">
                            <h3 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">{benefit.subtitle}</h3>
                            <h2 className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">{benefit.title}</h2>
                            <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                                {benefit.description}
                            </p>
                            {benefit.mockupComponent === "TailwindColorEditorMockup" && (
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
                            )}
                        </div>
                        <div className={`${benefit.mockupComponent === "TailwindColorEditorMockup" ? "w-full h-100 rounded-lg" : ""} order-1 lg:order-2`}>
                            {renderMockup(benefit.mockupComponent)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
