import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { PriceKey, PRO_PRODUCT_CONFIG } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const formatPrice = (cents: number) => `$${Math.round(cents / 100)}/month`;

interface PlanConfig {
    name: string;
    price: string;
    description: string;
    features: string[];
    defaultSelectValue: string;
    selectValues: { value: string; label: string }[];
    disableSelect: boolean;
}

export const ProCard = ({
    isActivePlan,
    delay,
}: {
    isActivePlan: boolean;
    delay: number;
}) => {
    const t = useTranslations();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [selectedTier, setSelectedTier] = useState<PriceKey>(PriceKey.PRO_MONTHLY_TIER_1);
    const { mutateAsync: checkout } = api.subscription.checkout.useMutation();
    const { mutateAsync: getPriceId } = api.subscription.getPriceId.useMutation();

    if (!PRO_PRODUCT_CONFIG.prices.length) {
        throw new Error('No pro tiers found');
    }

    const handleCheckout = async () => {
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


    const getPlanData = (): PlanConfig => {
        const defaultProTier = PRO_PRODUCT_CONFIG.prices[0];
        if (!defaultProTier) {
            throw new Error('No default pro tier found');
        }
        // Find the selected tier or use default
        const currentTier = selectedTier
            ? PRO_PRODUCT_CONFIG.prices.find(tier => tier.key === selectedTier) || defaultProTier
            : defaultProTier;

        if (!currentTier) {
            throw new Error('No tier selected for pro plan');
        }

        return {
            name: t('pricing.plans.pro.name'),
            price: formatPrice(currentTier.cost),
            description: t('pricing.plans.pro.description'),
            features: [
                'Unlimited projects',
                'Custom domain',
            ],
            defaultSelectValue: selectedTier || defaultProTier.key,
            selectValues: PRO_PRODUCT_CONFIG.prices.map(price => ({
                value: price.key,
                label: price.description
            })),
            disableSelect: false,
        };
    };

    const planData = getPlanData();



    return (
        <MotionCard
            className="w-[360px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <motion.div className="p-6 flex flex-col h-full">
                <div className="space-y-1">
                    <h2 className="text-title2">{planData.name}</h2>
                    <p className="text-foreground-onlook text-largePlus">{planData.price}</p>
                </div>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <p className="text-foreground-primary text-title3 text-balance">{planData.description}</p>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <div className="flex flex-col gap-2 mb-6">
                    <Select
                        value={planData.defaultSelectValue}
                        disabled={planData.disableSelect}
                        onValueChange={(value) => setSelectedTier(value as PriceKey)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent className="z-99">
                            <SelectGroup>
                                {planData.selectValues.map((value) => (
                                    <SelectItem key={value.value} value={value.value}>
                                        {value.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button
                        className="w-full"
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                    >
                        {isCheckingOut ? (
                            <div className="flex items-center gap-2">
                                <Icons.Shadow className="w-4 h-4 animate-spin" />
                                <span>{t(transKeys.pricing.loading.checkingPayment)}</span>
                            </div>
                        ) : (
                            isActivePlan
                                ? t(transKeys.pricing.buttons.currentPlan)
                                : t(transKeys.pricing.buttons.getPro)
                        )}
                    </Button>
                </div>
                <div className="flex flex-col gap-2 h-42">
                    {planData.features.map((feature, i) => (
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
