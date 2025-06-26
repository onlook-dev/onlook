'use client';

import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';

enum PlanKey {
    FREE = 'free',
    PRO = 'pro',
    TEAMS = 'teams',
}

interface TokenTier {
    tokens: string;
    price: number;
    label: string;
}

interface PlanData {
    key: PlanKey;
    name: string;
    basePrice: string;
    description: string;
    features: string[];
    tokenTiers?: TokenTier[];
}

const tokenTiers: TokenTier[] = [
    { tokens: '10M', price: 20, label: '10M / month' },
    { tokens: '26M', price: 50, label: '26M / month' },
    { tokens: '55M', price: 100, label: '55M / month' },
    { tokens: '120M', price: 200, label: '120M / month' },
    { tokens: '180M', price: 300, label: '180M / month' },
    { tokens: '240M', price: 400, label: '240M / month' },
];

const plans: PlanData[] = [
    {
        key: PlanKey.FREE,
        name: 'Free',
        basePrice: '$0',
        description: 'Explore core features at no cost — perfect for light, personal projects.',
        features: ['10 messages / month', '50 monthly limit', 'Public and private projects'],
    },
    {
        key: PlanKey.PRO,
        name: 'Pro',
        basePrice: '$20',
        description: 'More power for one professional: select your amount of monthly tokens based on your usage.',
        features: ['10M tokens per month', 'Public and private projects', 'No daily token limit', 'Increased file upload limit'],
        tokenTiers: tokenTiers,
    },
];

export default function PricingPage() {

    return (
        <WebsiteLayout showFooter={true}>


            <div className="w-full max-w-6xl mx-auto px-8 flex flex-col items-left">
                <div className="text-left mb-12 mt-24">
                    <h1 className="text-foreground text-5xl font-light mb-4">Pricing</h1>
                    <p className="text-muted-foreground text-regular">This page is coming soon. Thanks for your patience!</p>
                </div>
                <CTASection href="/" />
            </div>
            {/*
            <main className="flex-1 pt-28 w-full max-w-6xl mx-auto px-8 flex flex-col items-left">
                <div className="text-left mb-12 mt-24">
                    <h1 className="text-foreground text-5xl font-light mb-4">Pricing</h1>
                    <p className="text-muted-foreground text-title3">Start for free. Upgrade as you go.</p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <span className="text-sm text-muted-foreground">Current workspace:</span>
                        <span className="text-sm font-medium">Free - Personal</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-12 w-full max-w-6xl mx-auto">
                    {plans.map((plan) => (
                        <PricingCard
                            key={plan.key}
                            plan={plan.name}
                            basePrice={plan.basePrice}
                            description={plan.description}
                            features={plan.features}
                            tokenTiers={plan.tokenTiers}
                            buttonText={plan.key === PlanKey.FREE ? 'Your current plan' : 'Get started'}
                        />
                    ))}
                </div>
                <TierPricingTable />
            </main> 
            */}
        </WebsiteLayout>
    );
}
