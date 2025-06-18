import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import { useGetBackground } from '@/hooks/use-get-background';
import { PlanType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PricingCard } from './card';

export const SubscriptionModal = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const backgroundUrl = useGetBackground('create');
    const [isCheckingOut, setIsCheckingOut] = useState<PlanType | null>(null);

    const plan = userManager.subscription.subscription?.plan;
    const isProCheckout = isCheckingOut === PlanType.PRO;
    const isFreeCheckout = isCheckingOut === PlanType.FREE;
    const isPro = plan?.type === PlanType.PRO;
    const isFree = plan?.type === PlanType.FREE;

    useEffect(() => {
        let pollInterval: Timer | null = null;

        const getPlan = async () => {
            const plan = await userManager.subscription.getSubscriptionFromRemote();
            if (plan?.plan.type === PlanType.PRO) {
                editorEngine.error.clear();
            }
            setIsCheckingOut(null);
        };

        if (editorEngine.state.plansOpen) {
            getPlan();
            pollInterval = setInterval(getPlan, 3000);
        }

        // Cleanup function to clear interval when component unmounts or isPlansOpen changes
        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [editorEngine.state.plansOpen]);

    const startProCheckout = async () => {
        // sendAnalytics('start pro checkout');
        // try {
        //     setIsCheckingOut(PlanType.PRO);
        //     const res:
        //         | {
        //             success: boolean;
        //             error?: string;
        //         }
        //         | undefined = await invokeMainChannel(MainChannels.CREATE_STRIPE_CHECKOUT);
        //     if (res?.success) {
        //         toast.success(t('pricing.toasts.checkingOut.title'));
        //     } else {
        //         throw new Error('No checkout URL received');
        //     }
        //     setIsCheckingOut(null);
        // } catch (error) {
        //     toast.error(t('pricing.toasts.error.title'));
        //     console.error('Payment error:', error);
        //     setIsCheckingOut(null);
        // }
    };

    const manageSubscription = async () => {
        // try {
        //     setIsCheckingOut(PlanType.FREE);
        //     const res:
        //         | {
        //             success: boolean;
        //             error?: string;
        //         }
        //         | undefined = await invokeMainChannel(MainChannels.MANAGE_SUBSCRIPTION);
        //     if (res?.success) {
        //         toast.success(t('pricing.toasts.redirectingToStripe.title'));
        //     }
        //     if (res?.error) {
        //         throw new Error(res.error);
        //     }
        //     setIsCheckingOut(null);
        // } catch (error) {
        //     console.error('Error managing subscription:', error);
        //     toast.error(`Error managing subscription: ${error}`);
        //     setIsCheckingOut(null);
        // }
    };

    return (
        <AnimatePresence>
            {editorEngine.state.plansOpen && (
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
                            onClick={() => editorEngine.state.plansOpen = false}
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
                                        <PricingCard
                                            defaultSelectValue="10"
                                            selectValues={[
                                                { value: '10', label: '10 daily credits' },
                                            ]}
                                            disableSelect={true}
                                            plan={t('pricing.plans.basic.name')}
                                            price={t('pricing.plans.basic.price')}
                                            description={t('pricing.plans.basic.description')}
                                            features={[
                                                'Visual code editor access',
                                                '5 projects',
                                            ]}
                                            buttonText={
                                                isFree
                                                    ? t('pricing.buttons.currentPlan')
                                                    : t('pricing.buttons.manageSubscription')
                                            }
                                            buttonProps={{
                                                onClick: () => {
                                                    manageSubscription();
                                                },
                                                disabled:
                                                    isFree || isFreeCheckout,
                                            }}
                                            delay={0.1}
                                            isLoading={isFreeCheckout}
                                        />
                                        <PricingCard
                                            defaultSelectValue="100"
                                            selectValues={[
                                                { value: '100', label: '100 messages per Month' },
                                                { value: '1000', label: '1000 messages per Month' },
                                                { value: '10000', label: '10000 messages per Month' },
                                            ]}
                                            plan={t('pricing.plans.pro.name')}
                                            price={t('pricing.plans.pro.price')}
                                            description={t('pricing.plans.pro.description')}
                                            features={[
                                                'Unlimited projects',
                                                'Custom domain',
                                            ]}
                                            buttonText={
                                                isPro
                                                    ? t('pricing.buttons.currentPlan')
                                                    : t('pricing.buttons.getPro')
                                            }
                                            buttonProps={{
                                                onClick: startProCheckout,
                                                disabled:
                                                    isPro || isProCheckout,
                                            }}
                                            delay={0.2}
                                            isLoading={isProCheckout}
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
