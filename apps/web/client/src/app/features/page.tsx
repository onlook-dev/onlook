'use client';

import React from 'react';
import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { AuthModal } from '../_components/auth-modal';
import { FeaturesHero } from '../_components/hero/features-hero';
import { BenefitsSection } from '../_components/landing-page/benefits-section';
import { FeaturesIntroSection } from '../_components/landing-page/features-intro-section';
import { FeaturesGridSection } from '../_components/landing-page/features-grid-section';
import { CTASection } from '../_components/landing-page/cta-section';
import { FeaturesFAQSection } from '../_components/landing-page/features-faq-section';
import { WebsiteLayout } from '../_components/website-layout';

export default function FeaturesPage() {
    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <FeaturesHero />
                </div>

                <BenefitsSection />
                <FeaturesIntroSection />
                <FeaturesGridSection />
                
                <CTASection 
                    ctaText="Start Building with Onlook Today"
                    buttonText="Get Started for Free"
                />
                

                <FeaturesFAQSection />
                <AuthModal />

                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
