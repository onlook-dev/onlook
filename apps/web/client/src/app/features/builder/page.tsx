import React from 'react';
import { FeaturesHero } from '@/app/_components/hero/features-hero';
import { BenefitsSection } from '@/app/_components/landing-page/benefits-section';
import { FeaturesIntroSection } from '@/app/_components/landing-page/features-intro-section';
import { FeaturesGridSection } from '@/app/_components/landing-page/features-grid-section';
import { FAQSection } from '@/app/_components/landing-page/faq-section';
import { featuresBuilderContent } from '@/content/features-builder';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'React Visual Editor | Onlook',
    description: 'Build React apps visually with real-time code sync. Edit components directly in the browser while Onlook writes clean, maintainable code.',
};

export default function FeaturesBuilderPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <FeaturesHero content={featuresBuilderContent.hero} />
            <BenefitsSection benefits={featuresBuilderContent.benefits} />
            <FeaturesIntroSection intro={featuresBuilderContent.intro} />
            <FeaturesGridSection features={featuresBuilderContent.features} />
            <FAQSection 
                faqs={featuresBuilderContent.faqs}
                title={featuresBuilderContent.cta.text}
                buttonText={featuresBuilderContent.cta.buttonText}
            />
        </div>
    );
}
