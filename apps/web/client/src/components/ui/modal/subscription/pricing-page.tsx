import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import { sendAnalytics } from '@/utils/analytics';
import { SystemTheme } from '@onlook/models';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { toast } from '@onlook/ui/use-toast';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { PricingCard } from './pricing-card';

export const SubscriptionModal = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const { theme } = useTheme();

    const backgroundImageDark = '/assets/dunes-create-dark.png';
    const backgroundImageLight = '/assets/dunes-create-light.png';

    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);
    const [isCheckingOut, setIsCheckingOut] = useState<UsagePlanType | null>(null);

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === SystemTheme.DARK) {
                return backgroundImageDark;
            } else if (theme === SystemTheme.LIGHT) {
                return backgroundImageLight;
            } else if (theme === SystemTheme.SYSTEM) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    // useEffect(() => {
    //     let pollInterval: Timer | null = null;

    //     const getPlan = async () => {
    //         const plan = await userManager.subscription.getPlanFromServer();
    //         if (plan === UsagePlanType.PRO) {
    //             editorEngine.chat.stream.clearRateLimited();
    //             editorEngine.chat.stream.clearErrorMessage();
    //         }
    //         setIsCheckingOut(null);
    //     };

    //     if (editorEngine.state.plansOpen) {
    //         getPlan();
    //         pollInterval = setInterval(getPlan, 3000);
    //     }

    //     // Cleanup function to clear interval when component unmounts or isPlansOpen changes
    //     return () => {
    //         if (pollInterval) {
    //             clearInterval(pollInterval);
    //         }
    //     };
    // }, [editorEngine.state.plansOpen]);

    const startProCheckout = async () => {
        sendAnalytics('start pro checkout');
        try {
            setIsCheckingOut(UsagePlanType.PRO);
            const res:
                | {
                      success: boolean;
                      error?: string;
                  }
                | undefined = await invokeMainChannel(MainChannels.CREATE_STRIPE_CHECKOUT);
            if (res?.success) {
                toast({
                    variant: 'default',
                    title: t('pricing.toasts.checkingOut.title'),
                    description: t('pricing.toasts.checkingOut.description'),
                });
            } else {
                throw new Error('No checkout URL received');
            }
            setIsCheckingOut(null);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('pricing.toasts.error.title'),
                description: t('pricing.toasts.error.description'),
            });
            console.error('Payment error:', error);
            setIsCheckingOut(null);
        }
    };

    const manageSubscription = async () => {
        try {
            setIsCheckingOut(UsagePlanType.BASIC);
            const res:
                | {
                      success: boolean;
                      error?: string;
                  }
                | undefined = await invokeMainChannel(MainChannels.MANAGE_SUBSCRIPTION);
            if (res?.success) {
                toast({
                    variant: 'default',
                    title: t('pricing.toasts.redirectingToStripe.title'),
                    description: t('pricing.toasts.redirectingToStripe.description'),
                });
            }
            if (res?.error) {
                throw new Error(res.error);
            }
            setIsCheckingOut(null);
        } catch (error) {
            console.error('Error managing subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Error managing subscription',
                description: `${error}`,
            });
            setIsCheckingOut(null);
        }
    };

    return (
        <AnimatePresence>
            {editorEngine.state.plansOpen && (
                <motion.div
                    className="fixed inset-0 z-100"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        style={{
                            backgroundImage: `url(${backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="absolute inset-0 bg-background/50" />
                        <Button
                            variant="ghost"
                            onClick={() => (editorEngine.state.plansOpen = false)}
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
                                                {userManager.subscription.plan === UsagePlanType.PRO
                                                    ? t('pricing.titles.proMember')
                                                    : t('pricing.titles.choosePlan')}
                                            </h1>
                                        </div>
                                    </motion.div>
                                    <div className="flex gap-4">
                                        <PricingCard
                                            plan={t('pricing.plans.basic.name')}
                                            price={t('pricing.plans.basic.price')}
                                            description={t('pricing.plans.basic.description')}
                                            features={Array.from({ length: 5 }, (_, i) =>
                                                t(`pricing.plans.basic.features.${i}`, {
                                                    dailyMessages: 5,
                                                    monthlyMessages: 50,
                                                }),
                                            )}
                                            buttonText={
                                                userManager.subscription.plan ===
                                                UsagePlanType.BASIC
                                                    ? t('pricing.buttons.currentPlan')
                                                    : t('pricing.buttons.manageSubscription')
                                            }
                                            buttonProps={{
                                                onClick: () => {
                                                    manageSubscription();
                                                },
                                                disabled:
                                                    userManager.subscription.plan ===
                                                        UsagePlanType.BASIC ||
                                                    isCheckingOut === UsagePlanType.BASIC,
                                            }}
                                            delay={0.1}
                                            isLoading={isCheckingOut === UsagePlanType.BASIC}
                                        />
                                        <PricingCard
                                            plan={t('pricing.plans.pro.name')}
                                            price={t('pricing.plans.pro.price')}
                                            description={t('pricing.plans.pro.description')}
                                            features={Array.from({ length: 7 }, (_, i) =>
                                                t(`pricing.plans.pro.features.${i}`, {
                                                    dailyMessages: 5,
                                                    monthlyMessages: 50,
                                                }),
                                            )}
                                            buttonText={
                                                userManager.subscription.plan === UsagePlanType.PRO
                                                    ? t('pricing.buttons.currentPlan')
                                                    : t('pricing.buttons.getPro')
                                            }
                                            buttonProps={{
                                                onClick: startProCheckout,
                                                disabled:
                                                    userManager.subscription.plan ===
                                                        UsagePlanType.PRO ||
                                                    isCheckingOut === UsagePlanType.PRO,
                                            }}
                                            delay={0.2}
                                            isLoading={isCheckingOut === UsagePlanType.PRO}
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
