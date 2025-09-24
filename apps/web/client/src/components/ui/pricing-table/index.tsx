'use client';

import { useTranslations } from 'next-intl';

import { useAuthContext } from '@/app/auth/auth-context';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { EnterpriseCard } from '../pricing-modal/enterprise-card';
import { FreeCard } from '../pricing-modal/free-card';
import { ProCard } from '../pricing-modal/pro-card';

export const PricingTable = () => {
    const t = useTranslations();
    const { data: user } = api.user.get.useQuery();
    const { setIsAuthModalOpen } = useAuthContext();

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 sm:gap-8">
            <div className="flex w-full flex-col items-center gap-4 sm:gap-6 lg:flex-row lg:items-stretch">
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
                <EnterpriseCard delay={0.3} />
            </div>
            <div className="text-center">
                <p className="text-foreground-secondary/60 text-small text-balance">
                    {t(transKeys.pricing.footer.unusedMessages)}
                </p>
            </div>
        </div>
    );
};
