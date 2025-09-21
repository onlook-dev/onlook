'use client';

import { PricingTable } from '@/components/ui/pricing-table';
import { AuthModal } from '../_components/auth-modal';
import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';
import { FAQSection } from '../_components/landing-page/faq-section';

export default function PricingPage() {
    return (
        <WebsiteLayout showFooter={true}>
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center px-8">
                <div className="text-left mb-12 mt-24 w-full">
                    <h1 className="text-foreground text-5xl font-light mb-4">Pricing</h1>
                    <p className="text-muted-foreground text-regular">Get started for free. Upgrade as you go.</p>
                </div>
                <PricingTable />
            </div>
            <div className="w-full mx-auto flex flex-col items-center mt-16 sm:mt-20 lg:mt-28">
                <FAQSection />
            </div>
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
                <div className="mt-16 w-full">
                    <CTASection href="/" />
                </div>
            </div>
            <AuthModal />
        </WebsiteLayout>
    );
}
