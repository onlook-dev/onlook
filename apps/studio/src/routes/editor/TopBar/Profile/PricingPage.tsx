import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useTheme } from '@/components/ThemeProvider';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { type UsagePlanType } from '@onlook/models/usage';
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
    type: 'basic',
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
    type: 'pro',
    name: 'Onlook Pro',
    price: '$25/month',
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
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(BASIC_PLAN);

    const { toast } = useToast();
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
        let intervalId: Timer;
        const checkPremiumStatus = async () => {
            try {
                const res:
                    | {
                          success: boolean;
                          error?: string;
                      }
                    | undefined = await invokeMainChannel(MainChannels.CHECK_SUBSCRIPTION);
                if (res?.success) {
                    setCurrentPlan(PRO_PLAN);
                    setIsCheckingOut(false);
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error('Error checking premium status:', error);
            }
        };

        intervalId = setInterval(checkPremiumStatus, 3000);
        checkPremiumStatus();

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const startProCheckout = async () => {
        try {
            setIsCheckingOut(true);
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
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not initiate checkout process. Please try again.',
            });
            console.error('Payment error:', error);
            setIsCheckingOut(false);
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
                                            : 'Get Basic'
                                    }
                                    buttonProps={{
                                        disabled:
                                            currentPlan.type === BASIC_PLAN.type || isCheckingOut,
                                    }}
                                    delay={0.1}
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
                                            currentPlan.type === PRO_PLAN.type || isCheckingOut,
                                    }}
                                    delay={0.2}
                                    isLoading={isCheckingOut}
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
