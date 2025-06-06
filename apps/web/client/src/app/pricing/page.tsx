'use client';

import { useTranslations } from 'next-intl';
import { Footer } from '../_components/landing-page/page-footer';
import { TopBar } from '../_components/top-bar';
import { PricingCard } from './pricing-card';

export default function PricingPage() {
    const t = useTranslations();
    const plans = ['basic', 'launch', 'pro', 'scale'];

    const data = plans.map((key) => ({
        key,
        plan: t(`pricing.plans.${key}.name`),
        price: t(`pricing.plans.${key}.price`),
        description: t(`pricing.plans.${key}.description`),
        features: t(`pricing.plans.${key}.features`, { returnObjects: true }) as string[],
    }));

    return (
        <div className="flex flex-col min-h-screen items-center">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <main className="flex-1 pt-16 w-full max-w-6xl mx-auto px-8 flex flex-col items-center">
                <h1 className="text-foreground-primary text-4xl font-light mb-10">
                    {t('pricing.titles.choosePlan')}
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    {data.map((plan) => (
                        <PricingCard
                            key={plan.key}
                            plan={plan.plan}
                            price={plan.price}
                            description={plan.description}
                            features={plan.features}
                            buttonText={plan.key === 'basic' ? t('pricing.buttons.currentPlan') : t('pricing.buttons.getPlan', { plan: plan.plan })}
                        />
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}
