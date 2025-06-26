'use client';

import { AuthModal } from './_components/auth-modal';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/contributor-section';
import { WhatCanOnlookDoSection } from './_components/landing-page/what-can-onlook-do-section';
import { FAQSection } from './_components/landing-page/faq-section';
import { CTASection } from './_components/landing-page/cta-section';
import { TestimonialsSection } from './_components/landing-page/testimonials-section';
import { ObsessForHoursSection } from './_components/landing-page/obsess-for-hours-section';
import { WebsiteLayout } from './_components/website-layout';

export default function Main() {
    return (
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
        </WebsiteLayout>
    );
}
