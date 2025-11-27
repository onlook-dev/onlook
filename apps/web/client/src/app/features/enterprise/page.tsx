'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { EnterpriseHero } from '../../_components/hero/enterprise-hero';
import { EnterpriseBenefitsSection } from '../../_components/landing-page/enterprise-benefits-section';
import { CTASection } from '../../_components/landing-page/cta-section';
import { FAQSection } from '../../_components/landing-page/faq-section';
import { EnterpriseFeaturesGridSection } from '../../_components/landing-page/enterprise-features-grid-section';
import { EnterpriseFeaturesIntroSection } from '../../_components/landing-page/enterprise-features-intro-section';
import { ResponsiveMockupSection } from '../../_components/landing-page/responsive-mockup-section';
import { WebsiteLayout } from '../../_components/website-layout';

const enterpriseFaqs = [
    {
        question: 'What frameworks does Onlook support?',
        answer: 'Onlook works with any framework that renders to the DOM, including React, Vue, Angular, and more. If your framework can render components in a browser, Onlook can work with it.',
    },
    {
        question: 'Do I need to rebuild my existing components?',
        answer: 'No. Onlook works with your existing component library and codebase. You can import your existing codebase and start editing visually without any migration or refactoring.',
    },
    {
        question: 'How do designers ship changes to the codebase?',
        answer: 'Designers make visual changes in Onlook\'s editor, and those changes are held in the Onlook interface. When they\'re ready to be implemented, designers send the changes to an agent at the push of a button. Everything is written to a pull request, so it still follows your traditional development process with code review and approval.',
    },
    {
        question: 'Does Onlook work with component-driven development?',
        answer: 'Yes. Onlook is built for component-driven architectures and works seamlessly with existing design systems. You can build, test, and document components in isolation while maintaining your current workflow.',
    },
    {
        question: 'How does Onlook integrate with our existing workflow?',
        answer: 'Onlook works with your existing build process, version control, and CI/CD pipelines. Changes made in Onlook are written to pull requests, so they go through your standard code review and approval process before being merged. This ensures all changes follow your traditional development workflow.',
    },
];

export default function EnterpriseFeaturesPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <EnterpriseHero />
                </div>
                <ResponsiveMockupSection />
                <EnterpriseBenefitsSection />
                <EnterpriseFeaturesIntroSection />
                <EnterpriseFeaturesGridSection />
                <CTASection
                    ctaText={`Bring your team \nto Onlook today`}
                    buttonText="Book a Demo"
                    href={ExternalRoutes.BOOK_DEMO}
                />
                <FAQSection faqs={enterpriseFaqs} />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}

