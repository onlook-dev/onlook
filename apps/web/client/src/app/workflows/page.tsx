'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import Link from 'next/link';
import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';
import { UnicornBackground } from '../_components/hero/unicorn-background';

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

const workflows = [
    {
        title: 'Claude Code',
        description: 'The visual canvas your AI workflow is missing. Claude Code builds it, Onlook lets you design it.',
        href: Routes.WORKFLOWS_CLAUDE_CODE,
        logo: '/assets/logo-claude-code.svg',
        available: true,
    },
    {
        title: 'Vibe Coding',
        description: 'Vibe coding has a collaboration problem. Onlook solves it — team canvas, real components, PRs.',
        href: Routes.WORKFLOWS_VIBE_CODING,
        icon: Icons.Sparkles,
        available: true,
    },
    {
        title: 'Codex',
        description: 'Visual design layer for OpenAI Codex users. Coming soon.',
        href: '#',
        logo: '/assets/logo-codex.svg',
        available: false,
    },
];

export default function WorkflowsPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                {/* AI-Friendly Summary Section */}
                <section className="sr-only" aria-label="Workflows Summary">
                    <h1>Onlook Workflows: Integrate with Claude Code, Cursor, and AI Coding Tools</h1>
                    <p>
                        Onlook adds a visual design layer to your AI coding workflow. Connect Onlook to the tools
                        you already use — Claude Code, Cursor, and more. Design visually with your real components,
                        collaborate with your team in real-time, and ship changes as mergeable pull requests.
                    </p>
                    <h2>Available Integrations</h2>
                    <ul>
                        <li>Claude Code — The visual canvas your AI workflow is missing. Claude Code builds it, Onlook lets you design it.</li>
                        <li>Vibe Coding — Vibe coding has a collaboration problem. Onlook solves it with a team canvas, real components, and PR output.</li>
                        <li>Cursor — Visual design layer for Cursor users (coming soon)</li>
                        <li>Codex — Visual design layer for OpenAI Codex users (coming soon)</li>
                    </ul>
                    <h2>Key Benefits</h2>
                    <ul>
                        <li>Visual canvas for AI-generated UIs — see and arrange your code spatially</li>
                        <li>Design with your real components — buttons, cards, layouts your engineers already built</li>
                        <li>Real-time team collaboration — share canvas, leave spatial comments</li>
                        <li>Direct PR output — changes become mergeable pull requests</li>
                        <li>AI constrained to your design system — no brand drift</li>
                    </ul>
                </section>

                {/* Hero Section */}
                <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center p-8 text-center" id="hero">
                    <UnicornBackground />
                    <div className="relative z-20 flex max-w-3xl flex-col items-center gap-6 pt-4 pb-2">
                        <motion.h1
                            className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                        >
                            Workflows
                        </motion.h1>
                        <motion.p
                            className="text-center text-4xl !leading-[1.1] leading-tight font-light text-balance md:text-6xl"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                            style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                        >
                            Onlook fits into your stack
                        </motion.p>
                        <motion.h2
                            className="text-foreground-secondary mx-auto max-w-xl text-center text-lg text-balance"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                            style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                        >
                            Connect Onlook to the tools you already use. Design visually, ship real code.
                        </motion.h2>
                    </div>
                </div>

                {/* Workflows Grid */}
                <section className="w-full bg-black py-32">
                    <div className="mx-auto max-w-6xl px-8">
                        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
                            {workflows.map((workflow, index) => (
                                <motion.div
                                    key={workflow.title}
                                    {...getBlurAnimationProps(0.1 + index * 0.1)}
                                >
                                    {workflow.available ? (
                                        <Link
                                            href={workflow.href}
                                            className="group border-foreground-primary/10 hover:border-foreground-primary/30 flex h-full flex-col gap-4 rounded-lg border bg-black p-8 transition-all duration-300"
                                        >
                                            {workflow.logo ? (
                                                <img src={workflow.logo} alt={workflow.title} className="h-10 w-10" />
                                            ) : workflow.icon ? (
                                                <workflow.icon className="text-foreground-secondary group-hover:text-foreground-primary h-10 w-10 transition-colors" />
                                            ) : null}
                                            <h3 className="text-lg font-medium">{workflow.title}</h3>
                                            <p className="text-foreground-secondary text-balance">{workflow.description}</p>
                                            <div className="mt-auto flex items-center gap-2 pt-4 text-sm">
                                                <span className="text-foreground-primary">Learn more</span>
                                                <Icons.ArrowRight className="h-4 w-4" />
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="border-foreground-primary/10 flex h-full flex-col gap-4 rounded-lg border bg-black p-8">
                                            {workflow.logo ? (
                                                <img src={workflow.logo} alt={workflow.title} className="h-10 w-10 opacity-50" />
                                            ) : workflow.icon ? (
                                                <workflow.icon className="text-foreground-tertiary h-10 w-10 opacity-50" />
                                            ) : null}
                                            <h3 className="text-xl font-medium opacity-50">{workflow.title}</h3>
                                            <p className="text-foreground-secondary text-balance opacity-50">{workflow.description}</p>
                                            <div className="mt-auto pt-4">
                                                <span className="text-foreground-tertiary rounded-full border border-current px-3 py-1 text-xs">
                                                    Coming Soon
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <CTASection
                    ctaText={`Ready to add Onlook\nto your workflow?`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />

                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
