import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { PriceKey, PRO_PRODUCT_CONFIG } from '@onlook/stripe';
import { Badge } from "@onlook/ui/badge";
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LegacyPromotion } from './legacy-promotion';
import { useSubscription } from './use-subscription';

export const formatPrice = (cents: number) => `$${Math.round(cents / 100)}/month`;

const PRO_FEATURES = [
    'Unlimited projects',
    'Deploy to a custom domain',
    'Collaborate with your team',
    'Turn projects into templates',
];

export const ProCard = ({
    delay,
    isUnauthenticated = false,
    onSignupClick,
}: {
    delay: number;
    isUnauthenticated?: boolean;
    onSignupClick?: () => void;
}) => {
    const t = useTranslations();
    const { subscription, isPro, refetchSubscription, setIsCheckingSubscription } = useSubscription();
    const { mutateAsync: checkout } = api.subscription.checkout.useMutation();
    const { mutateAsync: getPriceId } = api.subscription.getPriceId.useMutation();
    const { mutateAsync: updateSubscription } = api.subscription.update.useMutation();
    const { mutateAsync: releaseSubscriptionSchedule } = api.subscription.releaseSubscriptionSchedule.useMutation();

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [selectedTier, setSelectedTier] = useState<PriceKey>(PriceKey.PRO_MONTHLY_TIER_1);

    const selectedTierData = PRO_PRODUCT_CONFIG.prices.find(tier => tier.key === selectedTier);
    const isNewTierSelected = selectedTier !== subscription?.price.key;
    const isPendingTierSelected = selectedTier !== subscription?.price.key && selectedTier === subscription?.scheduledChange?.price?.key;

    if (!PRO_PRODUCT_CONFIG.prices.length) {
        throw new Error('No pro tiers found');
    }

    const handleCheckout = async () => {
        try {
            if (isPro) {
                if (isPendingTierSelected) {
                    await handleCancelScheduledDowngrade();
                } else if (isNewTierSelected) {
                    await updateExistingSubscription();
                } else {
                    throw new Error('No action to perform');
                }
            } else {
                await createCheckoutSession();
            }
        } catch (error) {
            toast.error(t(transKeys.pricing.toasts.error.title), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            console.error('Payment error:', error);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleCancelScheduledDowngrade = async () => {
        try {
            if (!subscription?.scheduledChange?.scheduledChangeAt || !subscription.scheduledChange.stripeSubscriptionScheduleId) {
                throw new Error('No scheduled downgrade found.');
            }
            setIsCheckingOut(true);
            await releaseSubscriptionSchedule({ subscriptionScheduleId: subscription.scheduledChange.stripeSubscriptionScheduleId });
            refetchSubscription();
            toast.success('Scheduled downgrade canceled!');
        } catch (error) {
            console.error('Error canceling scheduled downgrade:', error);
            toast.error('Error canceling scheduled downgrade', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsCheckingOut(false);
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
            setIsCheckingSubscription(true);
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
            await updateSubscription({
                stripePriceId,
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeSubscriptionItemId: subscription.stripeSubscriptionItemId,
            });

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

    // Set selected tier based on current subscription
    useEffect(() => {
        if (subscription?.price.key) {
            setSelectedTier(subscription.price.key);
        }
    }, [subscription?.price.key]);

    const buttonContent = () => {
        if (isCheckingOut) {
            return (
                <div className="flex items-center gap-2">
                    <Icons.Shadow className="w-4 h-4 animate-spin" />
                    <span>
                        {t(transKeys.pricing.loading.checkingPayment)}
                    </span>
                </div>
            )
        }

        if (isUnauthenticated) {
            return "Get Started with Pro";
        }

        if (!isPro) {
            return "Upgrade to Pro Plan";
        }

        if (!isNewTierSelected) {
            return "Current plan";
        }

        if (isPendingTierSelected) {
            return "Cancel Scheduled Downgrade"
        }

        return "Update plan";
    };

    const handleButtonClick = () => {
        if (isUnauthenticated && onSignupClick) {
            onSignupClick();
        } else {
            handleCheckout();
        }
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
                                            {value.key === subscription?.scheduledChange?.price?.key && <Badge variant="secondary">Pending</Badge>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button
                        className="w-full"
                        onClick={handleButtonClick}
                        disabled={isCheckingOut || (!isUnauthenticated && !isNewTierSelected)}
                    >
                        {buttonContent()}
                    </Button>

                    {isPendingTierSelected && isPro && <div className="text-amber-500 text-small text-balance">
                        {`This plan will start on ${subscription?.scheduledChange?.scheduledChangeAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                    </div>}
                    {!isPro && <LegacyPromotion />}
                </div>
                <div className="flex flex-col gap-2 ">
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
