'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import { ClaudeCodeHero } from '../../_components/hero/claude-code-hero';
import { CTASection } from '../../_components/landing-page/cta-section';
import { FAQSection } from '../../_components/landing-page/faq-section';
import { OnlookInterfaceMockup } from '../../_components/landing-page/onlook-interface-mockup';
import { WebsiteLayout } from '../../_components/website-layout';

const claudeCodeFaqs = [
    {
        question: 'How does Onlook work with Claude Code?',
        answer: 'Claude Code handles the terminal and code generation. Onlook provides the visual canvas. Together, they give you a complete design-to-code workflow — Claude Code builds, Onlook lets you visually iterate and refine.',
    },
    {
        question: 'Do I need to know code to use Onlook with Claude Code?',
        answer: 'No. Onlook gives you a visual canvas where you can drag, resize, and arrange elements. The code runs underneath — you don\'t need to touch it unless you want to.',
    },
    {
        question: 'Can I use my existing components with Onlook?',
        answer: 'Yes. Onlook connects to your existing codebase and lets you design with your real components — the buttons, cards, and layouts your engineers already built.',
    },
    {
        question: 'How do I share my work with my team?',
        answer: 'Onlook has built-in team collaboration. Share your canvas, leave spatial comments, and work together in real-time. Changes sync to code and can be submitted as PRs.',
    },
    {
        question: 'What makes Onlook different from using Claude Code alone?',
        answer: 'Claude Code is terminal-based and works best for building. Onlook adds the visual layer designers need — an infinite canvas, team collaboration, and visual iteration on AI-generated UIs.',
    },
    {
        question: 'Does Onlook constrain AI to my design system?',
        answer: 'Yes. Unlike raw AI code generation, Onlook constrains AI to your existing components, colors, and tokens. This means outputs match your design system — no drift, no off-brand results.',
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

export default function ClaudeCodeWorkflowPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                {/* AI-Friendly Summary Section */}
                <section className="sr-only" aria-label="Claude Code Workflow Summary">
                    <h1>Claude Code for Designers: Add a Visual Canvas to Your AI Coding Workflow</h1>
                    <p>
                        Claude Code is amazing for building — but designers need to see, arrange, and refine visually.
                        Onlook adds the visual layer. Design with Claude Code, refine on an infinite canvas, ship PRs.
                        Together, they give you a complete design-to-code workflow.
                    </p>
                    <h2>The Challenge with Claude Code Alone</h2>
                    <ul>
                        <li>Terminal-based — not a visual environment designers are used to</li>
                        <li>Solo workflow — hard to share work-in-progress with teammates</li>
                        <li>AI drift — raw AI generation doesn't know your design system</li>
                        <li>No canvas — can't spatially arrange ideas or see the full picture</li>
                    </ul>
                    <h2>Onlook Solves This</h2>
                    <ul>
                        <li>Infinite canvas — visual environment with real code running underneath</li>
                        <li>Your real components — design with buttons, cards, layouts engineers already built</li>
                        <li>Team collaboration — share canvas, leave spatial comments, work in real-time</li>
                        <li>PR output — changes become real pull requests engineers can review</li>
                        <li>AI constrained — outputs match your design system, no drift</li>
                    </ul>
                    <h2>Coming Soon: Onlook MCP for Claude Code</h2>
                    <p>
                        Use /onlook directly in Claude Code to open your UI in a visual canvas, iterate with your
                        design system, and push changes back — all without leaving the terminal.
                    </p>
                </section>

                {/* Hero Section */}
                <div className="flex h-screen w-screen items-center justify-center" id="hero">
                    <ClaudeCodeHero />
                </div>

                {/* The Problem Section */}
                <section className="w-full bg-black py-32">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h2
                            className="text-foreground-secondary mb-6 text-sm font-medium uppercase tracking-wider"
                            {...getBlurAnimationProps()}
                        >
                            The Challenge
                        </motion.h2>
                        <motion.p
                            className="mb-16 max-w-3xl text-4xl font-light leading-tight text-balance md:text-5xl"
                            {...getBlurAnimationProps(0.1)}
                        >
                            Claude Code is amazing for building. But designers need to see, arrange, and refine. Together.
                        </motion.p>

                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                            {[
                                {
                                    icon: Icons.Terminal,
                                    title: 'Terminal-based',
                                    description: 'Claude Code works in the terminal — not a visual environment designers are used to.',
                                },
                                {
                                    icon: Icons.Person,
                                    title: 'Solo workflow',
                                    description: 'Hard to share work-in-progress with teammates or stakeholders.',
                                },
                                {
                                    icon: Icons.Component,
                                    title: 'AI drift',
                                    description: 'Raw AI generation doesn\'t know your design system — outputs drift off-brand.',
                                },
                                {
                                    icon: Icons.Layers,
                                    title: 'No canvas',
                                    description: 'Can\'t spatially arrange ideas or see the full picture at once.',
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
                            Onlook adds the visual layer. Design with Claude Code, refine on the canvas, ship PRs.
                        </motion.p>
                    </div>

                    {/* Editor Mockup - Desktop */}
                    <motion.div
                        className="hidden md:block w-screen h-[44rem] items-center justify-center mb-24"
                        {...getBlurAnimationProps(0.2)}
                    >
                        <OnlookInterfaceMockup />
                    </motion.div>

                    {/* Editor Mockup - Mobile */}
                    <motion.div
                        className="md:hidden w-screen relative overflow-hidden h-[880px]"
                        {...getBlurAnimationProps(0.2)}
                    >
                        <div className="absolute top-1/2 right-10 transform -translate-y-1/2 h-[800px] w-[1000px]">
                            <OnlookInterfaceMockup />
                        </div>
                    </motion.div>

                    <div className="mx-auto max-w-6xl px-8">
                        <div className="grid gap-8 md:grid-cols-4">
                            {[
                                {
                                    icon: Icons.Layers,
                                    title: 'Infinite canvas',
                                    description: 'A visual environment that feels intuitive, with real code running underneath.',
                                },
                                {
                                    icon: Icons.Component,
                                    title: 'Your real components',
                                    description: 'Design with the buttons, cards, and layouts your engineers already built.',
                                },
                                {
                                    icon: Icons.Person,
                                    title: 'Team collaboration',
                                    description: 'Share your canvas, leave spatial comments, work together in real-time.',
                                },
                                {
                                    icon: Icons.Branch,
                                    title: 'PR output',
                                    description: 'Changes become a real pull request. Engineers review and merge.',
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

                {/* Coming Soon: MCP Integration */}
                <section className="w-full bg-black py-32">
                    <div className="mx-auto max-w-6xl px-8">
                        <div className="border-foreground-primary/10 rounded-2xl border bg-gradient-to-b from-white/5 to-transparent p-12 md:p-16">
                            <motion.div
                                className="flex flex-col items-center text-center"
                                {...getBlurAnimationProps()}
                            >
                                <span className="mb-6 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.5)', backgroundColor: 'rgba(249, 115, 22, 0.1)', borderWidth: '1px', borderStyle: 'solid' }}>
                                    Coming Soon
                                </span>
                                <h2 className="mb-6 max-w-2xl text-3xl font-light leading-tight text-balance md:text-5xl">
                                    Onlook MCP for Claude Code
                                </h2>
                                <p className="text-foreground-secondary mb-8 max-w-xl text-lg text-balance">
                                    Use <code className="bg-foreground-primary/10 rounded px-2 py-0.5 font-mono text-base">/onlook</code> directly in Claude Code to open your UI in a visual canvas, iterate with your design system, and push changes back — all without leaving the terminal.
                                </p>
                                <div className="bg-background-secondary/50 rounded-lg border border-foreground-primary/20 p-6 font-mono text-sm">
                                    <span className="text-foreground-tertiary">$</span>{' '}
                                    <span className="text-foreground-secondary">claude</span>{' '}
                                    <span className="text-foreground-primary">/onlook open ./src/components/Hero.tsx</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <FAQSection faqs={claudeCodeFaqs} title="Frequently asked questions" />

                {/* CTA Section */}
                <CTASection
                    ctaText={`Try Onlook with your\nClaude Code project`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />

                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
