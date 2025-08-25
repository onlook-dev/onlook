'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { AiFeaturesHero } from '../../_components/hero/ai-features-hero';
import { AiBenefitsSection } from '../../_components/landing-page/ai-benefits-section';
import { CTASection } from '../../_components/landing-page/cta-section';
import { FAQSection } from '../../_components/landing-page/faq-section';
import { AiFeaturesGridSection } from '../../_components/landing-page/ai-features-grid-section';
import { AiFeaturesIntroSection } from '../../_components/landing-page/ai-features-intro-section';
import { ResponsiveMockupSection } from '../../_components/landing-page/responsive-mockup-section';
import { WebsiteLayout } from '../../_components/website-layout';

const aiFaqs = [
    {
        question: 'What is Onlook?',
        answer: 'Onlook is an open-source, visual editor for websites. It allows anyone to create and style their own websites without any coding knowledge.',
    },
    {
        question: 'What can I use Onlook to do?',
        answer: 'Onlook is great for creating websites, prototypes, user interfaces, and designs. Whether you need a quick mockup or a full-fledged website, ask Onlook to craft it for you.',
    },
    {
        question: 'How do I get started?',
        answer: 'Getting started with Onlook is easy. Simply sign up for an account, create a new project, and follow our step-by-step guide to deploy your first application.',
    },
    {
        question: 'Is Onlook free to use?',
        answer: 'Onlook is free for your first prompt, but you\'re limited by the number of messages you can send. Please see our Pricing page for more details.',
    },
    {
        question: 'What is the difference between Onlook and other design tools?',
        answer: 'Onlook is a visual editor for code. It allows you to create and style your own creations with code as the source of truth. While it is best suited for creating websites, it can be used for anything visual – presentations, mockups, and more. Because Onlook uses code as the source of truth, the types of designs you can create are unconstrained by Onlook\'s interface.',
    },
    {
        question: 'Why is Onlook open-source?',
        answer: 'Developers have historically been second-rate citizens in the design process. Onlook was founded to bridge the divide between design and development, and we wanted to make developers first-class citizens alongside designers. We chose to be open-source to give developers transparency into how we are building Onlook and how the work created through Onlook will complement the work of developers.',
    },
];

export default function AiFeaturesPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <AiFeaturesHero />
                </div>
                <ResponsiveMockupSection />
                <AiBenefitsSection />
                <AiFeaturesIntroSection />
                <AiFeaturesGridSection />
                <CTASection
                    ctaText={`Start Building with AI Today`}
                    buttonText="Get Started for Free"
                />
                <FAQSection faqs={aiFaqs} />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
