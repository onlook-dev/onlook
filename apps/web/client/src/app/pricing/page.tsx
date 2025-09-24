'use client';

import { PricingTable } from '@/components/ui/pricing-table';
import { AuthModal } from '../_components/auth-modal';
import { CTASection } from '../_components/landing-page/cta-section';
import { FAQSection } from '../_components/landing-page/faq-section';
import { WebsiteLayout } from '../_components/website-layout';

export default function PricingPage() {
    return (
        <WebsiteLayout showFooter={true}>
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-8">
                <div className="mt-24 mb-12 w-full text-left">
                    <h1 className="text-foreground mb-4 text-5xl font-light">Pricing</h1>
                    <p className="text-muted-foreground text-regular">
                        Get started for free. Upgrade as you go.
                    </p>
                </div>
                <PricingTable />
            </div>
            <div className="mx-auto mt-16 flex w-full flex-col items-center sm:mt-20 lg:mt-28">
                <FAQSection />
            </div>
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
                <div className="mt-16 w-full">
                    <CTASection href="/" />
                </div>
            </div>
            <AuthModal />
        </WebsiteLayout>
    );
}
