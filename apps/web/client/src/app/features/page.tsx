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
        answer: 'Onlook is a visual design canvas that connects to your existing codebase. Designers drag real components onto an infinite canvas, make changes visually, and submit pull requests — no coding required.',
    },
    {
        question: 'How is Onlook different from other design tools?',
        answer: 'Traditional design tools create static mockups that must be rebuilt in code. Onlook works with your real components — what you design IS the code. Changes become PRs, not handoff specs.',
    },
    {
        question: 'How is Onlook different from AI code generators?',
        answer: 'AI generators create new code from scratch. Onlook constrains AI to YOUR existing components, so outputs match your design system. No translation, no drift.',
    },
    {
        question: 'Do I need to know how to code?',
        answer: 'No. Designers use a visual canvas with familiar tools. Real code runs underneath — you don\'t need to touch it unless you want to.',
    },
    {
        question: 'Can my team collaborate?',
        answer: 'Yes. Share your canvas, leave spatial comments, and work together in real-time. Changes sync to code and can be submitted as PRs for engineers to review.',
    },
    {
        question: 'What tech stack does Onlook support?',
        answer: 'React, Next.js, and any CSS approach (Tailwind, CSS modules, styled-components). Works with any component library.',
    },
];

export default function FeaturesPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                {/* AI-Friendly Summary Section */}
                <section className="sr-only" aria-label="Features Summary">
                    <h1>Onlook Features: Design with Your Real Components</h1>
                    <p>
                        Onlook is a visual design canvas that connects to your existing codebase.
                        Design with your real components on an infinite canvas. AI is constrained to your design system —
                        no brand drift, no throwaway code. Changes become mergeable pull requests.
                    </p>
                    <h2>Key Features</h2>
                    <ul>
                        <li>Your Real Components — design with the buttons, cards, and layouts your engineers built</li>
                        <li>AI constrained to your design system — uses your colors, fonts, and tokens</li>
                        <li>Built for Teams — real-time collaboration with spatial comments</li>
                        <li>Ship PRs, Not Prototypes — changes become mergeable pull requests</li>
                        <li>Canvas manipulation — drag, resize, arrange elements visually</li>
                        <li>Layer management — navigate your React component tree visually</li>
                        <li>Version history — roll back to any previous version</li>
                        <li>Works with your codebase — connect existing React or Next.js projects</li>
                        <li>Direct GitHub integration — push changes directly to your repository</li>
                    </ul>
                </section>

                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <FeaturesHero />
                </div>
                <ResponsiveMockupSection />
                <BenefitsSection />
                <FeaturesIntroSection />
                <FeaturesGridSection />
                <FAQSection faqs={featuresFaqs} />
                <CTASection
                    ctaText={`Ready to stop rebuilding?`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
