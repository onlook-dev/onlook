'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes, Routes } from '@/utils/constants';
import { ButtonLink } from '../../_components/button-link';
import { UnicornBackground } from '../../_components/hero/unicorn-background';
import { CTASection } from '../../_components/landing-page/cta-section';
import { FAQDropdown } from '../../_components/landing-page/faq-dropdown';
import { ResponsiveMockupSection } from '../../_components/landing-page/responsive-mockup-section';
import { AiChatInteractive } from '../../_components/shared/mockups/ai-chat-interactive';
import { DirectEditingInteractive } from '../../_components/shared/mockups/direct-editing-interactive';
import { TailwindColorEditorMockup } from '../../_components/shared/mockups/tailwind-color-editor';
import { useGitHubStats } from '../../_components/top-bar/github';
import { WebsiteLayout } from '../../_components/website-layout';

function PrototypeFeaturesHero() {
    const router = useRouter();
    const { formatted: starCount } = useGitHubStats();

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-12 p-8 text-center text-lg">
            <UnicornBackground />
            <div className="relative z-20 flex max-w-3xl flex-col items-center gap-6 pt-4 pb-2">
                <motion.h1
                    className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    AI Prototype Generator
                </motion.h1>
                <motion.p
                    className="text-center text-4xl !leading-[1] leading-tight font-light text-balance md:text-6xl"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    From Idea to Interactive Prototype in Minutes
                </motion.p>
                <motion.p
                    className="text-foreground-secondary mx-auto max-w-xl text-center text-lg"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    Onlook's AI prototype generator creates functional React prototypes with real
                    interactions, not static mockups. Perfect for product managers and designers who
                    need rapid prototyping tools that generate production-ready code.
                </motion.p>
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    <Button
                        asChild
                        variant="secondary"
                        size="lg"
                        className="hover:bg-foreground-primary hover:text-background-primary cursor-pointer p-6 transition-all duration-300"
                    >
                        <a href={ExternalRoutes.BOOK_DEMO} target="_blank" rel="noopener noreferrer">
                            Book a Demo
                        </a>
                    </Button>
                </motion.div>
                <motion.div
                    className="text-foreground-secondary mt-8 flex items-center justify-center gap-6 text-sm"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    <div className="flex items-center gap-2">
                        <span>{starCount}+ GitHub stars</span>
                    </div>
                    <div className="bg-foreground-secondary h-1 w-1 rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>YC W25</span>
                    </div>
                    <div className="bg-foreground-secondary h-1 w-1 rounded-full"></div>
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
        <div className="mx-auto w-full max-w-6xl px-8 py-32 lg:py-64">
            <div className="space-y-24">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            AI-Powered Rapid Prototyping Tool
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Generate Functional Prototypes - Beyond Clickable Layers
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Unlike traditional prototyping tools that create static mockups,
                            Onlook's AI prototype generator builds fully interactive React
                            applications with real databases, user authentication, and working
                            features. Go beyond clickable wireframes.
                        </p>
                    </div>
                    <div className="order-1 lg:order-2">
                        <AiChatInteractive />
                    </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            Design to Code Tool for Product Teams
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Turn Designs into Working Code Instantly
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Import your Figma designs and watch AI transform them into
                            production-ready React components with proper state management,
                            responsive layouts, and clean code architecture. Bridge the gap between
                            design and development with intelligent code generation.
                        </p>
                    </div>
                    <div className="order-1 lg:order-2">
                        <DirectEditingInteractive />
                    </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                    <div className="order-2 flex flex-col lg:order-1">
                        <h2 className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase">
                            Product Prototype Testing Platform
                        </h2>
                        <p className="text-foreground-primary mb-6 text-2xl font-light md:text-4xl">
                            Test Ideas While Building the Full Product
                        </p>
                        <p className="text-foreground-secondary text-regular mb-8 max-w-xl text-balance">
                            Deploy your AI-generated prototypes instantly to gather real user
                            feedback. Share functional prototypes with stakeholders, run usability
                            tests, and validate product concepts with working applications that feel
                            like the real thing.
                        </p>
                    </div>
                    <div className="order-1 h-100 w-full rounded-lg lg:order-2">
                        <TailwindColorEditorMockup />
                    </div>
                </div>
            </div>
        </div>
    );
}

function PrototypeFeaturesGridSection() {
    return (
        <div className="mx-auto w-full max-w-6xl px-8 py-32">
            <div className="grid grid-cols-1 gap-x-16 gap-y-20 md:grid-cols-3">
                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        AI Prototype Generation
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Natural language to functional prototypes
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Describe your product idea in natural language and watch AI generate a fully
                        functional prototype with proper React architecture, state management, and
                        responsive design.
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Interactive Components
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Working features, not static mockups
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Create prototypes with working forms, navigation, data visualization, and
                        user interactions—not just static screens linked together.
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Real-Time Collaboration (planned)
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Team feedback and iteration
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Share prototypes instantly with your team for feedback, comments, and
                        collaborative editing in real-time.
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Figma to React Conversion
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Design to production-ready code
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Import Figma designs and convert them to clean, production-ready React code
                        with proper component structure and Tailwind styling.
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        One-Click Deployment
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Instant live prototypes
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Deploy your prototypes to live URLs instantly for user testing, stakeholder
                        reviews, and product validation without any setup.
                    </p>
                </div>

                <div>
                    <h2 className="text-foreground-secondary text-small mb-4 tracking-wider uppercase">
                        Version History
                    </h2>
                    <p className="text-foreground-primary mb-6 text-lg font-light text-balance md:text-xl">
                        Complete prototype evolution tracking
                    </p>
                    <p className="text-foreground-secondary text-regular leading-relaxed text-balance">
                        Track prototype iterations with automatic versioning, rollback to previous
                        versions, and maintain a complete history of your product evolution.
                    </p>
                </div>
            </div>
        </div>
    );
}

const prototypeFaqs = [
    {
        question: 'What makes Onlook different from other prototyping tools?',
        answer: "Onlook generates functional React prototypes with real interactions, databases, and working features—not just clickable mockups. While other tools create static prototypes, Onlook's AI builds production-ready code you can actually test and deploy.",
    },
    {
        question: 'How quickly can I create a prototype with Onlook?',
        answer: "Most prototypes can be generated in minutes. Simply describe your idea or import a Figma design, and Onlook's AI will create a functional React prototype with working components, proper styling, and interactive features ready for testing.",
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
        <div className="bg-background-onlook/80 w-full px-8 py-48" id="faq">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-24 md:flex-row md:gap-12">
                <div className="flex flex-1 flex-col items-start">
                    <h3 className="text-foreground-primary mt-4 mb-12 max-w-3xl text-5xl leading-[1.1] font-light text-balance md:text-6xl">
                        Frequently
                        <br />
                        asked questions
                    </h3>
                    <ButtonLink
                        href={Routes.FAQ}
                        rightIcon={<Icons.ArrowRight className="h-5 w-5" />}
                    >
                        Read our FAQs
                    </ButtonLink>
                </div>
                <div className="flex flex-1 flex-col gap-6">
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
                {/* AI-Friendly Summary Section */}
                <section className="sr-only" aria-label="AI Prototype Generator Summary">
                    <h1>Onlook AI Prototype Generator: From Idea to Interactive Prototype in Minutes</h1>
                    <p>
                        Onlook generates functional React prototypes with real interactions, databases, and working
                        features — not static mockups. Perfect for product managers and designers who need rapid
                        prototyping tools that generate production-ready code.
                    </p>
                    <h2>Key Prototyping Features</h2>
                    <ul>
                        <li>AI-powered prototype generation from natural language</li>
                        <li>Functional React prototypes with real interactions — not clickable mockups</li>
                        <li>Working forms, navigation, data visualization</li>
                        <li>Figma to React conversion</li>
                        <li>One-click deployment for user testing</li>
                        <li>Production-ready TypeScript and Tailwind code</li>
                        <li>Version history and rollback</li>
                        <li>Team sharing and real-time collaboration</li>
                    </ul>
                    <h2>Use Cases</h2>
                    <ul>
                        <li>Rapid product validation with working prototypes</li>
                        <li>User testing with interactive applications</li>
                        <li>Stakeholder demos that feel like the real product</li>
                        <li>MVP prototyping for startups</li>
                        <li>Design exploration with functional components</li>
                    </ul>
                </section>

                <div className="flex h-screen w-screen items-center justify-center" id="hero">
                    <PrototypeFeaturesHero />
                </div>
                <ResponsiveMockupSection />
                <PrototypeBenefitsSection />
                <div className="mx-auto w-full max-w-6xl px-8 py-32 text-center">
                    <div className="mx-auto max-w-3xl">
                        <h2 className="text-foreground-secondary mb-6 text-sm font-medium tracking-wider uppercase">
                            Complete Rapid Prototyping Solution
                        </h2>
                        <p className="text-foreground-primary mb-8 text-2xl leading-[1.1] font-light text-balance md:text-5xl">
                            All the Features you need to Build and Scale
                        </p>
                        <p className="text-foreground-secondary mx-auto max-w-xl text-lg text-balance">
                            Everything You Need for Fast Product Validation. Generate, test, and
                            iterate on product ideas with AI-powered prototyping tools. Create
                            functional React prototypes that help you validate concepts, gather
                            feedback, and make data-driven product decisions faster than ever.
                        </p>
                    </div>
                </div>
                <PrototypeFeaturesGridSection />
                <CTASection
                    ctaText={`Bring your team \nto Onlook today`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />
                <PrototypeFAQSection />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
