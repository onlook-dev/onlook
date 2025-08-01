'use client';

import { useStateManager } from '@/components/store/state';
import { useGetBackground } from '@/hooks/use-get-background';
import { transKeys } from '@/i18n/keys';
import { ProductType, ScheduledSubscriptionAction } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { FreeCard } from './free-card';
import { ProCard } from './pro-card';
import { useSubscription } from './use-subscription';

export const SubscriptionModal = observer(() => {
    const state = useStateManager();
    const t = useTranslations();
    const backgroundUrl = useGetBackground('create');
    const { subscription } = useSubscription();

    const getSubscriptionChangeMessage = () => {
        let message = '';
        if (subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.PRICE_CHANGE && subscription.scheduledChange.price) {
            message = `Your ${subscription.scheduledChange.price.monthlyMessageLimit} messages a month plan starts on ${subscription.scheduledChange.scheduledChangeAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        } else if (subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION) {
            message = `Your subscription will end on ${subscription.scheduledChange.scheduledChangeAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }

        if (message) {
            return (
                <div className="text-foreground-secondary/80 text-balance">
                    {message}
                </div>
            );
        }
    }

    return (
        <AnimatePresence>
            {state.isSubscriptionModalOpen && (
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
                            onClick={() => state.isSubscriptionModalOpen = false}
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
                                        <div className="flex flex-col gap-2 w-[46rem] items-start">
                                            <h1 className="text-title2 text-foreground-primary">
                                                {subscription?.product.type === ProductType.PRO
                                                    ? t(transKeys.pricing.titles.proMember)
                                                    : t(transKeys.pricing.titles.choosePlan)
                                                }
                                            </h1 >
                                            {getSubscriptionChangeMessage()}
                                        </div >
                                    </motion.div>
                                    <div className="flex gap-4">
                                        <FreeCard
                                            delay={0.1}
                                        />
                                        <ProCard
                                            delay={0.2}
                                        />
                                    </div >
                                    <motion.div
                                        className="flex flex-col gap-2 text-center"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <p className="text-foreground-secondary/60 text-small text-balance">
                                            {t(transKeys.pricing.footer.unusedMessages)}
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
