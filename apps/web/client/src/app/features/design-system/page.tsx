import React from 'react';
import { FeaturesHero } from '@/app/_components/hero/features-hero';
import { BenefitsSection } from '@/app/_components/landing-page/benefits-section';
import { FeaturesIntroSection } from '@/app/_components/landing-page/features-intro-section';
import { FeaturesGridSection } from '@/app/_components/landing-page/features-grid-section';
import { FAQSection } from '@/app/_components/landing-page/faq-section';
import { featuresDesignSystemContent } from '@/content/features-design-system';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Design System Management | Onlook',
    description: 'Streamline design system management for React teams. Visual design token management, centralized globals, and seamless component integration.',
};

export default function FeaturesDesignSystemPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <FeaturesHero content={featuresDesignSystemContent.hero} />
            <BenefitsSection benefits={featuresDesignSystemContent.benefits} />
            <FeaturesIntroSection intro={featuresDesignSystemContent.intro} />
            <FeaturesGridSection features={featuresDesignSystemContent.features} />
            <FAQSection 
                faqs={featuresDesignSystemContent.faqs}
                title={featuresDesignSystemContent.cta.text}
                buttonText={featuresDesignSystemContent.cta.buttonText}
            />
        </div>
    );
}
