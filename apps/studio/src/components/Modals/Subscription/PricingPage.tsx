import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useEditorEngine, useUserManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels, Theme } from '@onlook/models/constants';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { toast } from '@onlook/ui/use-toast';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PricingCard } from './PricingCard';

export const SubscriptionModal = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const { t } = useTranslation();
    const { theme } = useTheme();

    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);
    const [isCheckingOut, setIsCheckingOut] = useState<UsagePlanType | null>(null);

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === Theme.Dark) {
                return backgroundImageDark;
            } else if (theme === Theme.Light) {
                return backgroundImageLight;
            } else if (theme === Theme.System) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    useEffect(() => {
        let pollInterval: Timer | null = null;

        const getPlan = async () => {
            const plan = await userManager.subscription.getPlanFromServer();
            if (
                plan === UsagePlanType.PRO ||
                plan === UsagePlanType.LAUNCH ||
                plan === UsagePlanType.SCALE
            ) {
                editorEngine.chat.stream.clearRateLimited();
                editorEngine.chat.stream.clearErrorMessage();
            }
            setIsCheckingOut(null);
        };

        if (editorEngine.isPlansOpen) {
            getPlan();
            pollInterval = setInterval(getPlan, 3000);
        }

        // Cleanup function to clear interval when component unmounts or isPlansOpen changes
        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [editorEngine.isPlansOpen]);

    const startProCheckout = async () => {
        sendAnalytics('start pro checkout');
        try {
            setIsCheckingOut(UsagePlanType.PRO);
            const res:
                | {
                      success: boolean;
                      error?: string;
                  }
                | undefined = await invokeMainChannel(
                MainChannels.CREATE_STRIPE_CHECKOUT,
                UsagePlanType.PRO,
            );
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

    const startLaunchCheckout = async () => {
        sendAnalytics('start launch checkout');
        try {
            setIsCheckingOut(UsagePlanType.LAUNCH);
            const res:
                | {
                      success: boolean;
                      error?: string;
                  }
                | undefined = await invokeMainChannel(
                MainChannels.CREATE_STRIPE_CHECKOUT,
                UsagePlanType.LAUNCH,
            );
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

    const startScaleCheckout = async () => {
        sendAnalytics('start scale checkout');
        try {
            setIsCheckingOut(UsagePlanType.SCALE);
            const res:
                | {
                      success: boolean;
                      error?: string;
                  }
                | undefined = await invokeMainChannel(
                MainChannels.CREATE_STRIPE_CHECKOUT,
                UsagePlanType.SCALE,
            );
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
            {editorEngine.isPlansOpen && (
                <motion.div
                    className="fixed inset-0 overflow-y-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div
                        className="min-h-screen w-full pb-16"
                        style={{
                            backgroundImage: `url(${backgroundImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="absolute inset-0 bg-background/50 fixed" />
                        <div className="sticky top-0 right-0 w-full bg-transparent z-20 pt-8 pr-10 flex justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => (editorEngine.isPlansOpen = false)}
                                className="text-foreground-secondary"
                            >
                                <Icons.CrossL className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="relative z-10 w-full flex flex-col items-center justify-center pt-16 flex-grow">
                            <div className="w-full max-w-[1200px] mx-auto h-full">
                                <MotionConfig
                                    transition={{ duration: 0.5, type: 'spring', bounce: 0 }}
                                >
                                    <motion.div className="flex flex-col items-center gap-5 px-4 h-full">
                                        <motion.div
                                            className="flex flex-col gap-2 text-center mb-10"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.05 }}
                                        >
                                            <div className="flex flex-row gap-2 w-full justify-between">
                                                <h1 className="text-title1 font-medium text-foreground-primary">
                                                    {(() => {
                                                        switch (userManager.subscription.plan) {
                                                            case UsagePlanType.PRO:
                                                                return t(
                                                                    'pricing.titles.proMember',
                                                                );
                                                            case UsagePlanType.LAUNCH:
                                                                return t(
                                                                    'pricing.titles.launchMember',
                                                                );
                                                            case UsagePlanType.SCALE:
                                                                return t(
                                                                    'pricing.titles.scaleMember',
                                                                );
                                                            default:
                                                                return t(
                                                                    'pricing.titles.choosePlan',
                                                                );
                                                        }
                                                    })()}
                                                </h1>
                                            </div>
                                        </motion.div>
                                        <div className="flex flex-row gap-6 w-full justify-center pb-4 flex-grow">
                                            <PricingCard
                                                plan={t('pricing.plans.pro.name')}
                                                price={t('pricing.plans.pro.price')}
                                                description={t('pricing.plans.pro.description')}
                                                features={
                                                    t('pricing.plans.pro.features', {
                                                        returnObjects: true,
                                                    }) as string[]
                                                }
                                                buttonText={
                                                    userManager.subscription.plan ===
                                                    UsagePlanType.PRO
                                                        ? t('pricing.buttons.downgradeToBasic')
                                                        : t('pricing.buttons.getPro')
                                                }
                                                buttonProps={{
                                                    onClick: startProCheckout,
                                                    disabled: isCheckingOut === UsagePlanType.PRO,
                                                }}
                                                delay={0.1}
                                                isLoading={isCheckingOut === UsagePlanType.PRO}
                                                showFeaturesPrefix={true}
                                                featuresPrefixText="Everything in Free plus:"
                                                isCurrentPlan={
                                                    userManager.subscription.plan ===
                                                    UsagePlanType.PRO
                                                }
                                            />
                                            <PricingCard
                                                plan={t('pricing.plans.launch.name')}
                                                price={t('pricing.plans.launch.price')}
                                                description={t('pricing.plans.launch.description')}
                                                features={
                                                    t('pricing.plans.launch.features', {
                                                        returnObjects: true,
                                                    }) as string[]
                                                }
                                                buttonText={
                                                    userManager.subscription.plan ===
                                                    UsagePlanType.LAUNCH
                                                        ? t('pricing.buttons.downgradeToPro')
                                                        : 'Get Launch'
                                                }
                                                buttonProps={{
                                                    onClick: startLaunchCheckout,
                                                    disabled:
                                                        isCheckingOut === UsagePlanType.LAUNCH,
                                                }}
                                                delay={0.15}
                                                isLoading={isCheckingOut === UsagePlanType.LAUNCH}
                                                showFeaturesPrefix={true}
                                                featuresPrefixText="Everything in Pro plus:"
                                                isCurrentPlan={
                                                    userManager.subscription.plan ===
                                                    UsagePlanType.LAUNCH
                                                }
                                            />
                                            <PricingCard
                                                plan={t('pricing.plans.scale.name')}
                                                price={t('pricing.plans.scale.price')}
                                                description={t('pricing.plans.scale.description')}
                                                features={
                                                    t('pricing.plans.scale.features', {
                                                        returnObjects: true,
                                                    }) as string[]
                                                }
                                                buttonText={
                                                    userManager.subscription.plan ===
                                                    UsagePlanType.SCALE
                                                        ? t('pricing.buttons.downgradeToLaunch')
                                                        : 'Get Scale'
                                                }
                                                buttonProps={{
                                                    onClick: startScaleCheckout,
                                                    disabled: isCheckingOut === UsagePlanType.SCALE,
                                                }}
                                                delay={0.17}
                                                isLoading={isCheckingOut === UsagePlanType.SCALE}
                                                showFeaturesPrefix={true}
                                                featuresPrefixText="Everything in Launch plus:"
                                                isCurrentPlan={
                                                    userManager.subscription.plan ===
                                                    UsagePlanType.SCALE
                                                }
                                            />
                                        </div>
                                        <PricingCard
                                            plan={t('pricing.plans.basic.name')}
                                            price={t('pricing.plans.basic.price')}
                                            description={t('pricing.plans.basic.description')}
                                            features={
                                                t('pricing.plans.basic.features', {
                                                    returnObjects: true,
                                                    dailyMessages: 5,
                                                    monthlyMessages: 50,
                                                }) as string[]
                                            }
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
                                            className="hidden"
                                        />
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
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
