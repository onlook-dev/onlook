import { transKeys } from '@/i18n/keys';
import { PRO_TIERS } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const formatPrice = (cents: number) => `$${Math.round(cents / 100)}/month`;

interface PlanConfig {
    name: string;
    price: string;
    description: string;
    features: string[];
    defaultSelectValue: string;
    selectValues: { value: string; label: string }[];
    disableSelect: boolean;
}

const FREE_TIER: PlanConfig = {
    name: 'Free',
    price: '$0/month',
    description: 'Prototype and experiment in code with ease.',
    features: [
        'Visual code editor access',
        '5 projects',
        '10 AI chat messages a day',
        '50 AI messages a month',
        'Limited to 1 screenshot per chat'
    ],
    defaultSelectValue: '10',
    selectValues: [
        { value: '10', label: '10 Daily Messages' },
    ],
    disableSelect: true,
};

export const PricingCard = ({
    planType,
    buttonText,
    buttonProps,
    delay,
    isLoading,
}: {
    planType: 'free' | 'pro';
    buttonText: string;
    buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
    delay: number;
    isLoading?: boolean;
}) => {
    const t = useTranslations();
    const [selectedTier, setSelectedTier] = useState<string>('');

    if (planType === 'pro' && !PRO_TIERS.length) {
        throw new Error('No pro tiers found');
    }

    const defaultProTier = PRO_TIERS[0];
    if (!defaultProTier) {
        throw new Error('No default pro tier found');
    }

    const getPlanData = (): PlanConfig => {
        if (planType === 'free') {
            return FREE_TIER;
        } else {
            // Find the selected tier or use default
            const currentTier = selectedTier
                ? PRO_TIERS.find(tier => tier.key === selectedTier) || defaultProTier
                : defaultProTier;

            return {
                name: t('pricing.plans.pro.name'),
                price: formatPrice(currentTier.monthlyPrice),
                description: t('pricing.plans.pro.description'),
                features: [
                    'Unlimited projects',
                    'Custom domain',
                ],
                defaultSelectValue: selectedTier || defaultProTier.key,
                selectValues: PRO_TIERS.map(tier => ({
                    value: tier.key,
                    label: tier.key
                })),
                disableSelect: false,
            };
        }
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
                        onValueChange={setSelectedTier}
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
                        {...buttonProps}
                        disabled={isLoading || buttonProps.disabled}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Icons.Shadow className="w-4 h-4 animate-spin" />
                                <span>{t(transKeys.pricing.loading.checkingPayment)}</span>
                            </div>
                        ) : (
                            buttonText
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
