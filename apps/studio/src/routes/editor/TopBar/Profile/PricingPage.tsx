import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useTheme } from '@/components/ThemeProvider';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { UsagePlanType } from '@onlook/models/usage';
import { useToast } from '@onlook/ui/use-toast';
import { motion, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PricingCard } from './PricingCard';

interface UsagePlan {
    type: UsagePlanType;
    name: string;
    price: string;
    features: string[];
}

const BASIC_PLAN: UsagePlan = {
    type: UsagePlanType.BASIC,
    name: 'Onlook Basic',
    price: '$0/month',
    features: [
        'Visual code editor access',
        'Unlimited projects',
        '10 AI chat messages a day',
        '50 AI messages a month',
        'Limited to 1 screenshot per chat',
    ],
};

const PRO_PLAN: UsagePlan = {
    type: UsagePlanType.PRO,
    name: 'Onlook Pro',
    price: '$20/month',
    features: [
        'Visual code editor access',
        'Unlimited projects',
        'Unlimited AI chat messages a day',
        'Unlimited monthly chats',
        'Multiple screenshots per chat',
        '1 free custom domain hosted with Onlook',
        'Priority support',
    ],
};

export const PricingPage = () => {
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
                    title: 'Checking out',
                    description: 'You will now be redirected to Stripe to complete the payment.',
                });
            } else {
                throw new Error('No checkout URL received');
            }
            setIsCheckingOut(null);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not initiate checkout process. Please try again.',
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
                    title: 'Redirecting to Stripe',
                    description:
                        'You will now be redirected to Stripe to manage your subscription.',
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
                                <h1 className="text-title2 text-foreground-primary">
                                    {currentPlan === PRO_PLAN
                                        ? 'Thanks for being a Pro member!'
                                        : 'Choose your plan'}
                                </h1>
                            </motion.div>
                            <div className="flex gap-4">
                                <PricingCard
                                    plan={BASIC_PLAN.name}
                                    price={BASIC_PLAN.price}
                                    description="Prototype and experiment in code with ease."
                                    features={BASIC_PLAN.features}
                                    buttonText={
                                        currentPlan.type === BASIC_PLAN.type
                                            ? 'Current Plan'
                                            : 'Manage Subscription'
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
                                    plan={PRO_PLAN.name}
                                    price={PRO_PLAN.price}
                                    description="Creativity – unconstrained. Build stunning sites with AI."
                                    features={PRO_PLAN.features}
                                    buttonText={
                                        currentPlan.type === PRO_PLAN.type
                                            ? 'Current Plan'
                                            : 'Get Pro'
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
                                    {"Unused chat messages don't rollover to the next month"}
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
