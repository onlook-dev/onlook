'use client';

import { PricingTable } from '@/components/ui/pricing-table';
import { AuthModal } from '../_components/auth-modal';
import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';

export default function PricingPage() {
    return (
        <WebsiteLayout showFooter={true}>
            <div className="w-full max-w-6xl mx-auto px-8 flex flex-col items-center">
                <div className="text-left mb-12 mt-24 w-full">
                    <h1 className="text-foreground text-5xl font-light mb-4">Pricing</h1>
                    <p className="text-muted-foreground text-regular">Start for free. Upgrade as you go.</p>
                </div>
                <PricingTable />
                <div className="mt-16">
                    <CTASection href="/" />
                </div>
            </div>
            <AuthModal />
        </WebsiteLayout>
    );
}
