import React from 'react';
import { FeaturesHero } from '@/app/_components/hero/features-hero';
import { BenefitsSection } from '@/app/_components/landing-page/benefits-section';
import { FeaturesIntroSection } from '@/app/_components/landing-page/features-intro-section';
import { FeaturesGridSection } from '@/app/_components/landing-page/features-grid-section';
import { FAQSection } from '@/app/_components/landing-page/faq-section';
import { featuresAiContent } from '@/content/features-ai';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI-Powered Visual Builder | Onlook',
    description: 'Build React apps with AI that understands your code. Our intelligent system generates production-ready components while you focus on creativity.',
};

export default function FeaturesAIPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <FeaturesHero content={featuresAiContent.hero} />
            <BenefitsSection benefits={featuresAiContent.benefits} />
            <FeaturesIntroSection intro={featuresAiContent.intro} />
            <FeaturesGridSection features={featuresAiContent.features} />
            <FAQSection 
                faqs={featuresAiContent.faqs}
                title={featuresAiContent.cta.text}
                buttonText={featuresAiContent.cta.buttonText}
            />
        </div>
    );
}
