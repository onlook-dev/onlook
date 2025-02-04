import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useTheme } from '@/components/ThemeProvider';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons/index';
import { useToast } from '@onlook/ui/use-toast';
import { motion, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PricingCard } from './PricingCard';

interface UsagePlan {
    type: UsagePlanType;
}

const BASIC_PLAN: UsagePlan = {
    type: UsagePlanType.BASIC,
};

const PRO_PLAN: UsagePlan = {
    type: UsagePlanType.PRO,
};

export const PricingPage = () => {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);
    const [isCheckingOut, setIsCheckingOut] = useState<UsagePlanType | null>(null);
    const { toast } = useToast();

    const getCachedCurrentPlan = (): UsagePlan => {
        const cachedPlan = localStorage.getItem('currentPlan');
        if (cachedPlan) {
            return cachedPlan === UsagePlanType.PRO ? PRO_PLAN : BASIC_PLAN;
        }
        return BASIC_PLAN;
    };
    const [currentPlan, setCurrentPlan] = useState(getCachedCurrentPlan());

    const saveCachedCurrentPlan = (plan: UsagePlan) => {
        localStorage.setItem('currentPlan', plan.type);
    };

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === 'dark') {
                return backgroundImageDark;
            } else if (theme === 'light') {
                return backgroundImageLight;
            } else if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    useEffect(() => {
        let timeoutId: Timer;
        let attempts = 0;
        const MAX_INTERVAL = 10000; // Maximum interval of 10 seconds
        const BASE_INTERVAL = 2000; // Start with 2 seconds

        const checkPremiumStatus = async () => {
            try {
                const res:
                    | {
                          success: boolean;
                          error?: string;
                          data?: any;
                      }
                    | undefined = await invokeMainChannel(MainChannels.CHECK_SUBSCRIPTION);
                if (res?.success && res.data.name === 'pro') {
                    setCurrentPlan(PRO_PLAN);
                    saveCachedCurrentPlan(PRO_PLAN);
                    setIsCheckingOut(null);
                    return true;
                } else if (res?.success && res.data.name === 'basic') {
                    setCurrentPlan(BASIC_PLAN);
                    saveCachedCurrentPlan(BASIC_PLAN);
                }
                return false;
            } catch (error) {
                console.error('Error checking premium status:', error);
                return false;
            }
        };

        const scheduleNextCheck = async () => {
            const success = await checkPremiumStatus();
            if (!success) {
                attempts++;
                // Exponential backoff with a maximum interval
                const nextInterval = Math.min(
                    BASE_INTERVAL * Math.pow(1.5, attempts),
                    MAX_INTERVAL,
                );
                timeoutId = setTimeout(scheduleNextCheck, nextInterval);
            }
        };

        scheduleNextCheck();

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

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
            setIsCheckingOut(null);
        }
    };

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
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
                                        {currentPlan === PRO_PLAN
                                            ? t('pricing.titles.proMember')
                                            : t('pricing.titles.choosePlan')}
                                    </h1>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2 text-foreground-secondary text-md"
                                            >
                                                {i18n.language === 'en' ? 'English' : '日本語'}
                                                <Icons.ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => i18n.changeLanguage('en')}
                                            >
                                                English
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => i18n.changeLanguage('ja')}
                                            >
                                                日本語
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </motion.div>
                            <div className="flex gap-4">
                                <PricingCard
                                    plan={t('pricing.plans.basic.name')}
                                    price={t('pricing.plans.basic.price')}
                                    description={t('pricing.plans.basic.description')}
                                    features={
                                        t('pricing.plans.basic.features', {
                                            returnObjects: true,
                                        }) as string[]
                                    }
                                    buttonText={
                                        currentPlan.type === BASIC_PLAN.type
                                            ? t('pricing.buttons.currentPlan')
                                            : t('pricing.buttons.manageSubscription')
                                    }
                                    buttonProps={{
                                        onClick: () => {
                                            manageSubscription();
                                        },
                                        disabled:
                                            currentPlan.type === BASIC_PLAN.type ||
                                            isCheckingOut === 'basic',
                                    }}
                                    delay={0.1}
                                    isLoading={isCheckingOut === 'basic'}
                                />
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
                                        currentPlan.type === PRO_PLAN.type
                                            ? t('pricing.buttons.currentPlan')
                                            : t('pricing.buttons.getPro')
                                    }
                                    buttonProps={{
                                        onClick: startProCheckout,
                                        disabled:
                                            currentPlan.type === PRO_PLAN.type ||
                                            isCheckingOut === 'pro',
                                    }}
                                    delay={0.2}
                                    isLoading={isCheckingOut === 'pro'}
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
        </div>
    );
};

export default PricingPage;
