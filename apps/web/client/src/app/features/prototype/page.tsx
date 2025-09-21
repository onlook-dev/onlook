'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React from 'react';
import { ButtonLink } from '../../_components/button-link';
import { UnicornBackground } from '../../_components/hero/unicorn-background';
import { CTASection } from '../../_components/landing-page/cta-section';
import { FAQDropdown } from '../../_components/landing-page/faq-dropdown';
import { ResponsiveMockupSection } from '../../_components/landing-page/responsive-mockup-section';
import { WebsiteLayout } from '../../_components/website-layout';
import { useGitHubStats } from '../../_components/top-bar/github';
import { AiChatInteractive } from '../../_components/shared/mockups/ai-chat-interactive';
import { DirectEditingInteractive } from '../../_components/shared/mockups/direct-editing-interactive';
import { TailwindColorEditorMockup } from '../../_components/shared/mockups/tailwind-color-editor';

function PrototypeFeaturesHero() {
    const router = useRouter();
    const { formatted: starCount } = useGitHubStats();

    const handleGeneratePrototype = () => {
        router.push(Routes.HOME);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            <UnicornBackground />
            <div className="flex flex-col gap-6 items-center relative z-20 pt-4 pb-2 max-w-3xl">
                <motion.h1
                    className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    AI Prototype Generator
                </motion.h1>
                <motion.p
                    className="text-4xl md:text-6xl font-light leading-tight text-center !leading-[1] text-balance"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    From Idea to Interactive Prototype in Minutes
                </motion.p>
                <motion.p
                    className="text-lg text-foreground-secondary mx-auto max-w-xl text-center"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Onlook's AI prototype generator creates functional React prototypes with real interactions, not static mockups. Perfect for product managers and designers who need rapid prototyping tools that generate production-ready code.
                </motion.p>
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    <Button
                        variant="secondary"
                        size="lg"
                        className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-all duration-300"
                        onClick={handleGeneratePrototype}
                    >
                        Generate Your First Prototype
                    </Button>
                </motion.div>
                <motion.div
                    className="mt-8 flex items-center justify-center gap-6 text-sm text-foreground-secondary"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    <div className="flex items-center gap-2">
                        <span>{starCount}+ GitHub stars</span>
                    </div>
                    <div className="w-1 h-1 bg-foreground-secondary rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>YC W25</span>
                    </div>
                    <div className="w-1 h-1 bg-foreground-secondary rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>Open Source</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function PrototypeBenefitsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 lg:py-64 px-8">
            <div className="space-y-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">AI-Powered Rapid Prototyping Tool</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Generate Functional Prototypes - Beyond Clickable Layers</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Unlike traditional prototyping tools that create static mockups, Onlook's AI prototype generator builds fully interactive React applications with real databases, user authentication, and working features. Go beyond clickable wireframes.
                        </p>
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Design to Code Tool for Product Teams</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Turn Designs into Working Code Instantly</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Import your Figma designs and watch AI transform them into production-ready React components with proper state management, responsive layouts, and clean code architecture. Bridge the gap between design and development with intelligent code generation.
                        </p>
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Product Prototype Testing Platform</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Test Ideas While Building the Full Product</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Deploy your AI-generated prototypes instantly to gather real user feedback. Share functional prototypes with stakeholders, run usability tests, and validate product concepts with working applications that feel like the real thing.
                        </p>
                    </div>
                    <div className="w-full h-100 rounded-lg order-1 lg:order-2">
                        <TailwindColorEditorMockup />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PrototypeFeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h2 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">AI Prototype Generation</h2>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Natural language to functional prototypes</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Describe your product idea in natural language and watch AI generate a fully functional prototype with proper React architecture, state management, and responsive design.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Interactive Components</h2>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Working features, not static mockups</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Create prototypes with working forms, navigation, data visualization, and user interactions—not just static screens linked together.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Real-Time Collaboration (planned)</h2>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Team feedback and iteration</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Share prototypes instantly with your team for feedback, comments, and collaborative editing in real-time.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Figma to React Conversion</h2>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Design to production-ready code</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Import Figma designs and convert them to clean, production-ready React code with proper component structure and Tailwind styling.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">One-Click Deployment</h2>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Instant live prototypes</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Deploy your prototypes to live URLs instantly for user testing, stakeholder reviews, and product validation without any setup.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Version History</h2>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Complete prototype evolution tracking</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Track prototype iterations with automatic versioning, rollback to previous versions, and maintain a complete history of your product evolution.
                    </p>
                </div>
            </div>
        </div>
    );
}

const prototypeFaqs = [
    {
        question: 'What makes Onlook different from other prototyping tools?',
        answer: 'Onlook generates functional React prototypes with real interactions, databases, and working features—not just clickable mockups. While other tools create static prototypes, Onlook\'s AI builds production-ready code you can actually test and deploy.',
    },
    {
        question: 'How quickly can I create a prototype with Onlook?',
        answer: 'Most prototypes can be generated in minutes. Simply describe your idea or import a Figma design, and Onlook\'s AI will create a functional React prototype with working components, proper styling, and interactive features ready for testing.',
    },
    {
        question: 'Can I use my existing Figma designs?',
        answer: 'Yes! Onlook can import Figma designs and automatically convert them to functional React prototypes with proper component structure, responsive layouts, and clean code. Your designs become working applications, not just static screens.',
    },
    {
        question: 'What kind of prototypes can I build?',
        answer: 'You can build any type of web application prototype—dashboards, e-commerce sites, social platforms, SaaS tools, mobile apps, and more. Onlook generates React components with real functionality like forms, navigation, data visualization, and user authentication.',
    },
    {
        question: 'Is the generated code production-ready?',
        answer: 'Yes! Onlook generates clean, well-structured React code with proper TypeScript, Tailwind CSS, and modern best practices. You can use the prototype code as a foundation for your production application or continue iterating within Onlook.',
    },
    {
        question: 'How do I share prototypes with my team?',
        answer: 'Onlook provides instant deployment to live URLs that you can share with anyone. Team members can interact with the prototype, leave comments, and collaborate in real-time. No downloads or special software required for stakeholders to test your prototypes.',
    },
];

function PrototypeFAQSection() {
    return (
        <div className="w-full py-48 px-8 bg-background-onlook/80" id="faq">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-start">
                    <h3 className="text-foreground-primary text-5xl md:text-6xl leading-[1.1] font-light mb-12 mt-4 max-w-3xl text-balance">
                        Frequently<br />asked questions
                    </h3>
                    <ButtonLink href={Routes.FAQ} rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Read our FAQs</ButtonLink>
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    <FAQDropdown faqs={prototypeFaqs} />
                </div>
            </div>
        </div>
    );
}

export default function PrototypeFeaturesPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <PrototypeFeaturesHero />
                </div>
                <ResponsiveMockupSection />
                <PrototypeBenefitsSection />
                <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                            Complete Rapid Prototyping Solution
                        </h2>
                        <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                            All the Features you need to Build and Scale
                        </p>
                        <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                            Everything You Need for Fast Product Validation. Generate, test, and iterate on product ideas with AI-powered prototyping tools. Create functional React prototypes that help you validate concepts, gather feedback, and make data-driven product decisions faster than ever.
                        </p>
                    </div>
                </div>
                <PrototypeFeaturesGridSection />
                <CTASection
                    ctaText={`Start Prototyping with AI Today`}
                    buttonText="Generate Your First Prototype"
                />
                <PrototypeFAQSection />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
