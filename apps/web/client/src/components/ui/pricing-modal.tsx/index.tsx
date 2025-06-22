'use client';

import { useUserManager } from '@/components/store/user';
import { useGetBackground } from '@/hooks/use-get-background';
import { api } from '@/trpc/react';
import { ProductType } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { FreeCard } from './free-card';
import { ProCard } from './pro-card';

export const SubscriptionModal = observer(() => {
    const userManager = useUserManager();
    const t = useTranslations();

    const backgroundUrl = useGetBackground('create');
    const { data: subscription, isLoading: isLoadingSubscription } = api.subscription.get.useQuery();

    const plan = subscription?.product;
    const isPro = plan?.type === ProductType.PRO;
    const isFree = !subscription;

    return (
        <AnimatePresence>
            {userManager.subscription.isModalOpen && (
                <motion.div
                    className="fixed inset-0 z-99"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        style={{
                            backgroundImage: `url(${backgroundUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="absolute inset-0 bg-background/50" />
                        <Button
                            variant="ghost"
                            onClick={() => userManager.subscription.isModalOpen = false}
                            className="fixed top-8 right-10 text-foreground-secondary"
                        >
                            <Icons.CrossL className="h-4 w-4" />
                        </Button>
                        <div className="relative z-10">
                            <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                                <motion.div className="flex flex-col items-center gap-3">
                                    <motion.div
                                        className="flex flex-col gap-2 text-center mb-4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 }}
                                    >
                                        <div className="flex flex-row gap-2 w-[46rem] justify-between">
                                            <h1 className="text-title2 text-foreground-primary">
                                                {isPro
                                                    ? t('pricing.titles.proMember')
                                                    : t('pricing.titles.choosePlan')}
                                            </h1>
                                        </div>
                                    </motion.div>
                                    <div className="flex gap-4">
                                        <FreeCard
                                            isActivePlan={isFree}
                                            delay={0.1}
                                        />
                                        <ProCard
                                            isActivePlan={isPro}
                                            delay={0.2}
                                        />
                                    </div>
                                    <motion.div
                                        className="flex flex-col gap-2 text-center"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <p className="text-foreground-secondary/60 text-small text-balance">
                                            {t('pricing.footer.unusedMessages')}
                                        </p>
                                    </motion.div>
                                </motion.div>
                            </MotionConfig>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
