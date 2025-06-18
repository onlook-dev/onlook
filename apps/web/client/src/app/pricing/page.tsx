'use client';


import { Footer } from '../_components/landing-page/page-footer';
import { TopBar } from '../_components/top-bar';
import { PricingCard } from './pricing-card';
import { TierPricingTable } from './tier-pricing';

enum PlanType {
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
    key: PlanType;
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
        key: PlanType.FREE,
        name: 'Free',
        basePrice: '$0',
        description: 'Explore core features at no cost — perfect for light, personal projects.',
        features: ['1M tokens / month', '150K daily limit', 'Public and private projects'],
    },
    {
        key: PlanType.PRO,
        name: 'Pro',
        basePrice: '$20',
        description: 'More power for one professional: select your amount of monthly tokens based on your usage.',
        features: ['10M tokens per month', 'Public and private projects', 'No daily token limit', 'Increased file upload limit'],
        tokenTiers: tokenTiers,
    },
    {
        key: PlanType.TEAMS,
        name: 'Teams',
        basePrice: '$30',
        description: 'Role based access with one consolidated management for your whole team.',
        features: ['10M / month', 'Centralized billing'],
        tokenTiers: tokenTiers,
    },
];

export default function PricingPage() {
    return <div>Coming soon</div>;

    return (
        <div className="flex flex-col min-h-screen justify-center items-center">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <main className="flex-1 pt-28 w-full max-w-7xl mx-auto px-8 flex flex-col items-center">
                <div className="text-center mb-12">
                    <h1 className="text-foreground text-5xl font-medium mb-4">Pricing</h1>
                    <p className="text-muted-foreground text-lg">Start for free. Upgrade as you go.</p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <span className="text-sm text-muted-foreground">Current workspace:</span>
                        <span className="text-sm font-medium">Free - Personal</span>
                        <div className="flex items-center gap-2 ml-4">
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-md">Save 10%</span>
                            <span className="text-sm text-muted-foreground">Annual billing</span>
                            <div className="w-8 h-4 bg-muted rounded-full relative">
                                <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-6 w-full max-w-5xl">
                    {plans.map((plan) => (
                        <PricingCard
                            key={plan.key}
                            plan={plan.name}
                            basePrice={plan.basePrice}
                            description={plan.description}
                            features={plan.features}
                            tokenTiers={plan.tokenTiers}
                            buttonText={plan.key === PlanType.FREE ? 'Your current plan' : 'Get started'}
                        />
                    ))}
                </div>
            </main>
            <TierPricingTable />
            <Footer />
        </div>
    );
}
