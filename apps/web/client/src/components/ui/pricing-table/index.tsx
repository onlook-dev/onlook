'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { useTranslations } from 'next-intl';
import { EnterpriseCard } from '../pricing-modal/enterprise-card';
import { FreeCard } from '../pricing-modal/free-card';
import { ProCard } from '../pricing-modal/pro-card';

export const PricingTable = () => {
    const t = useTranslations();
    const { data: user } = api.user.get.useQuery();
    const { setIsAuthModalOpen } = useAuthContext();

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-6xl mx-auto">
            <div className="text-center">
                <h1 className="text-title2 text-foreground-primary mb-4">
                    {t(transKeys.pricing.titles.choosePlan)}
                </h1>
                <p className="text-foreground-secondary/60 text-small text-balance">
                    {t(transKeys.pricing.footer.unusedMessages)}
                </p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center md:items-stretch">
                <FreeCard 
                    delay={0.1} 
                    isUnauthenticated={!user}
                    onSignupClick={() => setIsAuthModalOpen(true)}
                />
                <ProCard 
                    delay={0.2} 
                    isUnauthenticated={!user}
                    onSignupClick={() => setIsAuthModalOpen(true)}
                />
                <EnterpriseCard 
                    delay={0.3}
                />
            </div>
        </div>
    );
};
