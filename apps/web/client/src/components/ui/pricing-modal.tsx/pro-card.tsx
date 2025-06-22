import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { PriceKey, PRO_PRODUCT_CONFIG, ProductType, type Subscription } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

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

    const createCheckoutSession = async () => {
        try {
            setIsCheckingOut(true);
            const stripePriceId = await getPriceId({ priceKey: selectedTier as PriceKey });
            const session = await checkout({ priceId: stripePriceId });

            if (session?.url) {
                window.open(session.url, '_blank');
            } else {
                throw new Error('No checkout URL received');
            }
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
                    <span>{t(transKeys.pricing.loading.checkingPayment)}</span>
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
                                        {value.description}
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
