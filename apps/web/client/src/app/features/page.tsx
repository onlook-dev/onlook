'use client';

import React from 'react';
import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { AuthModal } from '../_components/auth-modal';
import { FeaturesHero } from '../_components/hero/features-hero';
import { SocialProofSection } from '../_components/landing-page/social-proof-section';
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

                <SocialProofSection />
                <BenefitsSection />
                <FeaturesIntroSection />
                <FeaturesGridSection />
                
                <CTASection 
                    ctaText="Start Building with Onlook Today"
                    buttonText="Get Started for Free"
                    showSubtext={false}
                />
                
                <div className="w-full max-w-6xl mx-auto py-16 px-8 text-center">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-foreground-secondary text-sm">
                        <div>✓ Free to start - no credit card required</div>
                        <div>✓ Open source &amp; transparent</div>
                        <div>✓ 21.2k+ GitHub stars</div>
                        <div>✓ YC W25 backed</div>
                    </div>
                </div>

                <FeaturesFAQSection />
                <AuthModal />

                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout>
        </CreateManagerProvider>
    );
}
