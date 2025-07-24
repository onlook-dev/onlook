'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { AuthModal } from './_components/auth-modal';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/contributor-section';
import { CTASection } from './_components/landing-page/cta-section';
import { FAQSection } from './_components/landing-page/faq-section';
import { TestimonialsSection } from './_components/landing-page/testimonials-section';
import { WhatCanOnlookDoSection } from './_components/landing-page/what-can-onlook-do-section';
import { WebsiteLayout } from './_components/website-layout';

export default function Main() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <Hero />
                </div>

                {/* <FeaturesSection /> */}
                {/* <CodeOneToOneSection /> */}
                <ContributorSection />
                <WhatCanOnlookDoSection />
                {/* <ObsessForHoursSection /> */}
                <TestimonialsSection />
                <FAQSection />
                <CTASection />
                <AuthModal />

                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout >
        </CreateManagerProvider>
    );
}
