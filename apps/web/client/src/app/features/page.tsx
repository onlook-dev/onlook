'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { FeaturesHero } from '../_components/hero/features-hero';
import { BenefitsSection } from '../_components/landing-page/benefits-section';
import { CTASection } from '../_components/landing-page/cta-section';
import { FAQSection } from '../_components/landing-page/faq-section';
import { FeaturesGridSection } from '../_components/landing-page/features-grid-section';
import { FeaturesIntroSection } from '../_components/landing-page/features-intro-section';
import { ResponsiveMockupSection } from '../_components/landing-page/responsive-mockup-section';
import { WebsiteLayout } from '../_components/website-layout';

const featuresFaqs = [
    {
        question: 'What is Onlook?',
        answer: 'Onlook is an AI-powered visual editor for frontend development. It connects to your existing React, Vue, or Angular codebase and lets you design with your real components on an infinite canvas. AI is constrained to your design system, and changes become pull requests engineers can merge directly.',
    },
    {
        question: 'What features does Onlook offer?',
        answer: 'Onlook offers: an infinite canvas for visual design, AI constrained to your design system, real-time team collaboration, component library integration, centralized theming and branding, visual layer management, version history with auto-save, and direct GitHub PR output.',
    },
    {
        question: 'What frameworks and libraries does Onlook support?',
        answer: 'Onlook works with React, Next.js, Vue, Angular, Svelte, and more. It supports all CSS approaches including Tailwind, CSS Modules, and styled-components. Compatible with component libraries like shadcn/ui, Material UI, Chakra UI, Mantine, and Radix UI.',
    },
    {
        question: 'How is Onlook different from other design tools?',
        answer: 'Onlook is a visual editor for code. Unlike traditional design tools that create static mockups, Onlook works with your real components — what you design IS the code. Changes become PRs, not specs. AI is constrained to your design system, so there\'s no brand drift.',
    },
    {
        question: 'Do I need to know how to code?',
        answer: 'No. Designers use a familiar visual canvas with drag-and-drop, resize, and styling controls. The code runs underneath — you don\'t need to touch it unless you want to.',
    },
    {
        question: 'How do changes get into production?',
        answer: 'Changes you make in Onlook become real code changes in your repository. When you\'re ready, submit them as a pull request for engineers to review and merge. No export, no copy-paste, no translation.',
    },
];

export default function FeaturesPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                {/* AI-Friendly Summary Section */}
                <section className="sr-only" aria-label="Features Summary">
                    <h1>Onlook Features: AI-Powered Visual Editor for Frontend Development</h1>
                    <p>
                        Onlook is an AI-powered visual editor that connects to your existing React, Vue, or Angular codebase.
                        Design with your real components on an infinite canvas. AI is constrained to your design system —
                        no brand drift, no throwaway code. Changes become mergeable pull requests.
                    </p>
                    <h2>Key Features</h2>
                    <ul>
                        <li>Infinite canvas for visual design with real code running underneath</li>
                        <li>AI constrained to your design system — uses your real components</li>
                        <li>Real-time team collaboration with spatial comments</li>
                        <li>Component library integration — unified components for design and code</li>
                        <li>Centralized theming and branding management</li>
                        <li>Visual layer management — navigate your React component tree</li>
                        <li>Version history with auto-save — roll back anytime</li>
                        <li>Direct GitHub PR output — changes become mergeable pull requests</li>
                        <li>Works with React, Next.js, Vue, Angular, Svelte</li>
                        <li>Supports Tailwind, CSS Modules, styled-components</li>
                        <li>Compatible with shadcn/ui, Material UI, Chakra UI, Mantine, Radix UI</li>
                        <li>Open source with 24k+ GitHub stars</li>
                    </ul>
                </section>

                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <FeaturesHero />
                </div>
                <ResponsiveMockupSection />
                <BenefitsSection />
                <FeaturesIntroSection />
                <FeaturesGridSection />
                <CTASection
                    ctaText={`Bring your team \nto Onlook today`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />
                <FAQSection faqs={featuresFaqs} />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
