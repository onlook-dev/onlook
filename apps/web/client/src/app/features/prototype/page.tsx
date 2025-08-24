import React from 'react';
import { FeaturesHero } from '@/app/_components/hero/features-hero';
import { BenefitsSection } from '@/app/_components/landing-page/benefits-section';
import { FeaturesIntroSection } from '@/app/_components/landing-page/features-intro-section';
import { FeaturesGridSection } from '@/app/_components/landing-page/features-grid-section';
import { FAQSection } from '@/app/_components/landing-page/faq-section';
import { featuresPrototypeContent } from '@/content/features-prototype';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Prototype Generator | Onlook',
    description: 'From idea to interactive prototype in minutes. Generate fully functional React prototypes with real interactions, data flow, and responsive design.',
};

export default function FeaturesPrototypePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <FeaturesHero content={featuresPrototypeContent.hero} />
            <BenefitsSection benefits={featuresPrototypeContent.benefits} />
            <FeaturesIntroSection intro={featuresPrototypeContent.intro} />
            <FeaturesGridSection features={featuresPrototypeContent.features} />
            <FAQSection 
                faqs={featuresPrototypeContent.faqs}
                title={featuresPrototypeContent.cta.text}
                buttonText={featuresPrototypeContent.cta.buttonText}
            />
        </div>
    );
}
