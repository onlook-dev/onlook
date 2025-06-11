'use client';

import { transKeys } from '@/i18n/keys';
import { useTranslations } from 'next-intl';
import { Footer } from '../_components/landing-page/page-footer';
import { TopBar } from '../_components/top-bar';
import { PricingCard } from './pricing-card';
import { TierPricingTable } from './tier-pricing';

enum PlanKey {
    FREE = 'free',
    PRO = 'pro',
    TEAMS = 'teams',
}

interface PlanData {
    key: PlanKey;
    name: string;
    price: string;
    description: string;
    features: string[];
}

const plans: PlanData[] = [
    {
        key: PlanKey.FREE,
        name: 'Free',
        price: '$0/month',
        description: 'Prototype and experiment in code with ease.',
        features: ['TBD'],
    },
    {
        key: PlanKey.PRO,
        name: 'Pro',
        price: '$20/month',
        description: 'For teams and individuals.',
        features: ['TBD'],
    },
]

export default function PricingPage() {
    const t = useTranslations();

    return (
        <div className="flex flex-col min-h-screen justify-center items-center">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <main className="flex-1 pt-28 w-full max-w-6xl mx-auto px-8 flex flex-col items-center">
                <h1 className="text-foreground-primary text-4xl font-light mb-10">
                    {t(transKeys.pricing.titles.choosePlan)}
                </h1>
                <div className="grid grid-cols-2 gap-6 w-2/3">
                    {plans.map((plan) => (
                        <PricingCard
                            key={plan.key}
                            plan={plan.name}
                            price={plan.price}
                            description={plan.description}
                            features={plan.features}
                            buttonText={plan.key === PlanKey.FREE ? t(transKeys.pricing.buttons.currentPlan) : `Get ${plan.name}`}
                        />
                    ))}
                </div>
            </main>
            <TierPricingTable />
            <Footer />
        </div>
    );
}
