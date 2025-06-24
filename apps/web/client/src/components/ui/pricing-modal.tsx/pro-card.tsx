import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { PriceKey, PRO_PRODUCT_CONFIG, ProductType, type Subscription } from '@onlook/stripe';
import { Badge } from "@onlook/ui/badge";
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export const formatPrice = (cents: number) => `$${Math.round(cents / 100)}/month`;

const PRO_FEATURES = [
    'Unlimited projects',
    'Custom domain',
];

export const ProCard = ({
    subscription,
    delay,
    refetchSubscription,
}: {
    subscription: Subscription | null;
    delay: number;
    refetchSubscription: () => void;
}) => {
    const t = useTranslations();
    const { mutateAsync: checkout } = api.subscription.checkout.useMutation();
    const { mutateAsync: getPriceId } = api.subscription.getPriceId.useMutation();
    const { mutateAsync: updateSubscription } = api.subscription.update.useMutation();

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [selectedTier, setSelectedTier] = useState<PriceKey>(PriceKey.PRO_MONTHLY_TIER_1);
    const [isPollingForSubscription, setIsPollingForSubscription] = useState(false);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedTierData = PRO_PRODUCT_CONFIG.prices.find(tier => tier.key === selectedTier);
    const isPro = subscription?.product.type === ProductType.PRO;
    const isNewTierSelected = selectedTier !== subscription?.price.key;

    if (!PRO_PRODUCT_CONFIG.prices.length) {
        throw new Error('No pro tiers found');
    }

    const handleCheckout = async () => {
        if (isPro && isNewTierSelected) {
            await updateExistingSubscription();
        } else {
            await createCheckoutSession();
        }
    };

    const startPollingForSubscription = () => {
        setIsPollingForSubscription(true);

        // Clear any existing intervals
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
        }

        // Start polling every 5 seconds
        pollingIntervalRef.current = setInterval(() => {
            refetchSubscription();
        }, 5000);

        // Stop polling after 5 minutes (300 seconds) as a safety timeout
        pollingTimeoutRef.current = setTimeout(() => {
            stopPollingForSubscription();
            toast.info('Subscription check timed out', {
                description: 'Please refresh the page to see your updated subscription status.',
            });
        }, 300000);
    };

    const stopPollingForSubscription = () => {
        setIsPollingForSubscription(false);

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
    };

    const createCheckoutSession = async () => {
        try {
            setIsCheckingOut(true);
            const stripePriceId = await getPriceId({ priceKey: selectedTier as PriceKey });
            const session = await checkout({ priceId: stripePriceId });

            if (!session?.url) {
                throw new Error('No checkout URL received');
            }

            window.open(session.url, '_blank');
            // Start polling for the subscription to be updated every 3 seconds
            startPollingForSubscription();

        } catch (error) {
            toast.error(t('pricing.toasts.error.title'), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            console.error('Payment error:', error);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const updateExistingSubscription = async () => {
        try {
            if (!subscription?.stripeSubscriptionId) {
                throw new Error('No subscription ID found');
            }

            setIsCheckingOut(true);
            const stripePriceId = await getPriceId({ priceKey: selectedTier as PriceKey });
            const res = await updateSubscription({
                stripePriceId,
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeSubscriptionItemId: subscription.stripeSubscriptionItemId,
            });

            if (!res) {
                throw new Error('No response from update subscription');
            }
            refetchSubscription();
            toast.success('Subscription updated!');
        } catch (error) {
            toast.error(t('pricing.toasts.error.title'), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            console.error('Payment error:', error);
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Stop polling when subscription becomes pro (payment successful)
    useEffect(() => {
        if (isPro && isPollingForSubscription) {
            stopPollingForSubscription();
            toast.success('Subscription activated successfully!');
        }
    }, [isPro, isPollingForSubscription]);

    // Set selected tier based on current subscription
    useEffect(() => {
        if (subscription?.price.key) {
            setSelectedTier(subscription.price.key);
        }
    }, [subscription?.price.key]);

    // Cleanup polling on component unmount
    useEffect(() => {
        return () => {
            stopPollingForSubscription();
        };
    }, []);

    const buttonContent = () => {
        if (isCheckingOut || isPollingForSubscription) {
            return (
                <div className="flex items-center gap-2">
                    <Icons.Shadow className="w-4 h-4 animate-spin" />
                    <span>
                        {isPollingForSubscription
                            ? 'Waiting for payment...'
                            : t(transKeys.pricing.loading.checkingPayment)
                        }
                    </span>
                </div>
            )
        }

        if (!isPro) {
            return t(transKeys.pricing.buttons.getPro);
        }

        if (!isNewTierSelected) {
            return "Current plan";
        }

        return "Update plan";
    };

    return (
        <MotionCard
            className="w-[360px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <motion.div className="p-6 flex flex-col h-full">
                <div className="space-y-1">
                    <h2 className="text-title2">{t(transKeys.pricing.plans.pro.name)}</h2>
                    <p className="text-foreground-onlook text-largePlus">{formatPrice(selectedTierData?.cost ?? 0)}</p>
                </div>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <p className="text-foreground-primary text-title3 text-balance">{t(transKeys.pricing.plans.pro.description)}</p>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <div className="flex flex-col gap-2 mb-6">
                    <Select
                        value={selectedTier}
                        onValueChange={(value) => setSelectedTier(value as PriceKey)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent className="z-99">
                            <SelectGroup>
                                {PRO_PRODUCT_CONFIG.prices.map((value) => (
                                    <SelectItem key={value.key} value={value.key}>
                                        <div className="flex items-center gap-2">
                                            {value.description}
                                            {value.key === subscription?.price.key && <Badge variant="secondary">Current Plan</Badge>}
                                            {value.key === subscription?.scheduledPrice?.key && <Badge variant="secondary">Pending</Badge>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button
                        className="w-full"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || !isNewTierSelected}
                    >
                        {buttonContent()}
                    </Button>
                </div>
                <div className="flex flex-col gap-2 h-42">
                    {PRO_FEATURES.map((feature) => (
                        <div
                            key={feature}
                            className="flex items-center gap-3 text-sm text-foreground-secondary/80"
                        >
                            <Icons.CheckCircled className="w-5 h-5 text-foreground-secondary/80" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </MotionCard>
    );
};
