'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { AuthModal } from './_components/auth-modal';
import { Hero } from './_components/hero';
import { TeaserDemoSection } from './_components/landing-page/teaser-demo-section';
import {
    CreditBureauSection,
    FixPacksSection,
    DesignSystemSection,
    DeploySection,
    WhiteLabelSection,
} from './_components/landing-page/synthia-sections';
import { FAQSection } from './_components/landing-page/faq-section';
import { CTASection } from './_components/landing-page/cta-section';
import { WebsiteLayout } from './_components/website-layout';

export default function Main() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <Hero />
                </div>
                <TeaserDemoSection />
                <CreditBureauSection />
                <FixPacksSection />
                <DesignSystemSection />
                <DeploySection />
                <WhiteLabelSection />
                <FAQSection />
                <CTASection href={ExternalRoutes.BOOK_DEMO} />
                <AuthModal />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
