'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import { AiFrontendHero } from '../../_components/hero/ai-frontend-hero';
import { CTASection } from '../../_components/landing-page/cta-section';
import { FAQSection } from '../../_components/landing-page/faq-section';
import { OnlookInterfaceMockup } from '../../_components/landing-page/onlook-interface-mockup';
import { WebsiteLayout } from '../../_components/website-layout';

const aiFrontendFaqs = [
    {
        question: 'What is Onlook?',
        answer: 'Onlook is an AI-powered visual editor for frontend development. It connects to your existing React, Vue, or Angular codebase and lets designers create interfaces using real components. AI is constrained to your design system, and changes become pull requests engineers can merge directly.',
    },
    {
        question: 'How is Onlook different from other AI code generators?',
        answer: 'Most AI tools generate generic HTML/CSS from scratch. Onlook is different — it connects to your existing component library and constrains AI to YOUR design system. This means outputs are consistent, on-brand, and directly mergeable. No translation step needed.',
    },
    {
        question: 'Does Onlook work with my existing React components?',
        answer: 'Yes. Onlook connects to your codebase and lets you design with your real components — the buttons, cards, and layouts your engineers already built. AI suggestions use your actual component API, not generic alternatives.',
    },
    {
        question: 'What frontend frameworks does Onlook support?',
        answer: 'Onlook works with React, Next.js, Vue, Angular, Svelte, Preact, SolidJS, Qwik, and Web Components. It also supports any CSS approach — Tailwind, CSS Modules, styled-components, Emotion, SASS/SCSS, Less, Vanilla Extract, and more.',
    },
    {
        question: 'What component libraries does Onlook support?',
        answer: 'Onlook works with all major component libraries including shadcn/ui, Material UI, Mantine, Chakra UI, Radix UI, Ant Design, Headless UI, Blueprint, Fluent UI, and PrimeReact. If your components work in your codebase, they work in Onlook.',
    },
    {
        question: 'Can AI drift from my design system?',
        answer: 'No. Unlike raw AI code generation, Onlook constrains AI to your existing components, colors, and tokens. AI can only use what\'s in your design system — no drift, no off-brand results.',
    },
    {
        question: 'How do I get AI-generated changes into production?',
        answer: 'Changes you make in Onlook become real code changes. When you\'re ready, submit them as a pull request for engineers to review and merge. No export, no copy-paste, no translation.',
    },
    {
        question: 'Do I need to know how to code?',
        answer: 'No. Designers use a familiar visual canvas with drag-and-drop, resize, and styling controls. The code runs underneath — you don\'t need to touch it unless you want to.',
    },
    {
        question: 'Who is Onlook for?',
        answer: 'Onlook is for product teams with designers and an existing component library. Ideal users include design engineers, product designers working in code-forward teams, and teams maintaining design systems.',
    },
];

// Helper function for blur animations
const getBlurAnimationProps = (delay: number = 0) => ({
    initial: { opacity: 0, filter: 'blur(4px)' },
    whileInView: { opacity: 1, filter: 'blur(0px)' },
    viewport: { once: true, margin: '-100px 0px -100px 0px', amount: 0.3 },
    transition: {
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
    style: {
        willChange: 'opacity, filter',
        transform: 'translateZ(0)',
    },
});

export default function AiForFrontendPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                {/* Hero Section */}
                <div className="flex h-screen w-screen items-center justify-center" id="hero">
                    <AiFrontendHero />
                </div>

                {/* AI-Friendly Summary Section - Hidden visually but available for crawlers */}
                <section className="sr-only" aria-label="Product Summary">
                    <h1>Onlook: AI for Frontend Development</h1>
                    <p>
                        Onlook is an AI-powered visual editor for frontend development that connects to your existing
                        React, Vue, or Angular codebase. Unlike generic AI code generators that produce throwaway HTML/CSS,
                        Onlook constrains AI to your real components and design system — your buttons, cards, and layouts.
                        Changes become mergeable pull requests, not prototypes that need translation.
                    </p>
                    <h2>Key Features</h2>
                    <ul>
                        <li>AI constrained to your design system — no brand drift</li>
                        <li>Works with React, Next.js, Vue, Angular, Svelte, and more</li>
                        <li>Supports Tailwind, CSS Modules, styled-components, SASS</li>
                        <li>Compatible with shadcn/ui, Material UI, Chakra UI, Mantine, Radix UI</li>
                        <li>Visual canvas interface — no coding required for designers</li>
                        <li>Changes become real pull requests engineers can merge</li>
                        <li>Open source with 24k+ GitHub stars</li>
                    </ul>
                    <h2>Who is Onlook for?</h2>
                    <p>
                        Onlook is for product teams with designers and an existing component library.
                        Ideal users include design engineers, product designers working in code-forward teams,
                        and teams maintaining design systems who want AI that respects their existing work.
                    </p>
                </section>

                {/* The Problem Section */}
                <section className="w-full bg-black py-32">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h2
                            className="text-foreground-secondary mb-6 text-sm font-medium uppercase tracking-wider"
                            {...getBlurAnimationProps()}
                        >
                            The Problem
                        </motion.h2>
                        <motion.p
                            className="mb-16 max-w-3xl text-4xl font-light leading-tight text-balance md:text-5xl"
                            {...getBlurAnimationProps(0.1)}
                        >
                            AI generates code. But it doesn't know your design system.
                        </motion.p>

                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                {
                                    icon: Icons.CrossCircled,
                                    title: 'Generic output',
                                    description: 'AI tools generate throwaway HTML/CSS that doesn\'t match your components.',
                                },
                                {
                                    icon: Icons.Brand,
                                    title: 'Brand drift',
                                    description: 'Without constraints, AI outputs drift off-brand with inconsistent styling.',
                                },
                                {
                                    icon: Icons.Code,
                                    title: 'Translation required',
                                    description: 'Generated code needs to be rebuilt to work with your real components.',
                                },
                                {
                                    icon: Icons.Stop,
                                    title: 'Not mergeable',
                                    description: 'Prototypes stay prototypes — they can\'t become production code directly.',
                                },
                            ].map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    className="flex flex-col gap-4"
                                    {...getBlurAnimationProps(0.2 + index * 0.1)}
                                >
                                    <item.icon className="text-foreground-secondary h-5 w-5" />
                                    <h3 className="text-base font-medium text-balance">{item.title}</h3>
                                    <p className="text-foreground-secondary text-base text-balance">{item.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* The Solution Section */}
                <section className="w-full bg-black pt-32 pb-16">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h2
                            className="text-foreground-secondary mb-6 text-sm font-medium uppercase tracking-wider"
                            {...getBlurAnimationProps()}
                        >
                            The Solution
                        </motion.h2>
                        <motion.p
                            className="mb-24 max-w-3xl text-4xl font-light leading-tight text-balance md:text-5xl"
                            {...getBlurAnimationProps(0.1)}
                        >
                            AI constrained to your design system. No drift. No translation.
                        </motion.p>
                    </div>

                    {/* Editor Mockup */}
                    <motion.div
                        className="hidden md:block w-screen h-[44rem] items-center justify-center mb-24"
                        {...getBlurAnimationProps(0.2)}
                    >
                        <OnlookInterfaceMockup />
                    </motion.div>

                    <div className="mx-auto max-w-6xl px-8">
                        <div className="grid gap-8 md:grid-cols-4">
                            {[
                                {
                                    icon: Icons.Component,
                                    title: 'Your real components',
                                    description: 'AI uses your actual buttons, cards, and layouts — not generic alternatives.',
                                },
                                {
                                    icon: Icons.Brand,
                                    title: 'Your design tokens',
                                    description: 'Colors, spacing, typography — AI respects your existing system.',
                                },
                                {
                                    icon: Icons.Check,
                                    title: 'PR-ready output',
                                    description: 'Changes become real PRs. Engineers review and merge directly.',
                                },
                                {
                                    icon: Icons.Sparkles,
                                    title: 'Visual + AI',
                                    description: 'Point-and-click interface with AI that understands context.',
                                },
                            ].map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    className="flex flex-col gap-3"
                                    {...getBlurAnimationProps(0.3 + index * 0.1)}
                                >
                                    <item.icon className="text-foreground-secondary h-5 w-5" />
                                    <h3 className="text-base font-medium text-balance">{item.title}</h3>
                                    <p className="text-foreground-secondary text-sm text-balance">{item.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Frameworks Section */}
                <section className="w-full bg-black py-32">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h2
                            className="text-foreground-secondary mb-6 text-sm font-medium uppercase tracking-wider"
                            {...getBlurAnimationProps()}
                        >
                            Works With Your Stack
                        </motion.h2>
                        <motion.p
                            className="mb-16 max-w-3xl text-4xl font-light leading-tight text-balance md:text-5xl"
                            {...getBlurAnimationProps(0.1)}
                        >
                            React, Next.js, Vue, Angular. Tailwind, CSS Modules, styled-components. Your stack, your way.
                        </motion.p>

                        <div className="grid gap-6 md:grid-cols-3">
                            {[
                                {
                                    title: 'Frameworks',
                                    items: ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Preact', 'SolidJS', 'Qwik', 'Web Components'],
                                },
                                {
                                    title: 'Styling',
                                    items: ['Tailwind CSS', 'CSS Modules', 'styled-components', 'Emotion', 'SASS/SCSS', 'Less', 'Vanilla Extract', 'Stitches', 'Plain CSS'],
                                },
                                {
                                    title: 'Component Libraries',
                                    items: ['shadcn/ui', 'Material UI', 'Mantine', 'Chakra UI', 'Radix UI', 'Ant Design', 'Headless UI', 'Blueprint', 'Fluent UI', 'PrimeReact'],
                                },
                            ].map((category, categoryIndex) => (
                                <motion.div
                                    key={category.title}
                                    className="border-foreground-primary/10 rounded-lg border p-6"
                                    {...getBlurAnimationProps(0.2 + categoryIndex * 0.1)}
                                >
                                    <h3 className="text-foreground-secondary mb-4 text-sm font-medium uppercase tracking-wider">{category.title}</h3>
                                    <ul className="flex flex-col gap-2">
                                        {category.items.map((item, itemIndex) => (
                                            <motion.li
                                                key={item}
                                                className="text-foreground-primary text-base"
                                                initial={{ opacity: 0, y: 5 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true, margin: '-50px' }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: 0.3 + categoryIndex * 0.1 + itemIndex * 0.03,
                                                    ease: [0.25, 0.46, 0.45, 0.94],
                                                }}
                                            >
                                                {item}
                                            </motion.li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <FAQSection faqs={aiFrontendFaqs} title="Frequently asked questions" />

                {/* CTA Section */}
                <CTASection
                    ctaText={`Start building with AI\nthat knows your stack`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />

                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
