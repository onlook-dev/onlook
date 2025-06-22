import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface PlanConfig {
    name: string;
    price: string;
    description: string;
    features: string[];
    defaultSelectValue: string;
    selectValues: { value: string; label: string }[];
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
};

export const FreeCard = ({
    isActivePlan,
    delay,
}: {
    isActivePlan: boolean;
    delay: number;
}) => {
    const t = useTranslations();
    const { mutateAsync: manageSubscription } = api.subscription.manageSubscription.useMutation();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const handleManageSubscription = async () => {
        try {
            setIsCheckingOut(true);
            const session = await manageSubscription();

            if (session?.url) {
                window.open(session.url, '_blank');
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Error managing subscription:', error);
            toast.error('Error managing subscription', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsCheckingOut(false);
        }
    };

    const planData = FREE_TIER;

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
                        disabled={true}
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
                        onClick={handleManageSubscription}
                        disabled={isCheckingOut || isActivePlan}
                    >
                        {isCheckingOut ? (
                            <div className="flex items-center gap-2">
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                <span>{t(transKeys.pricing.loading.checkingPayment)}</span>
                            </div>
                        ) : (
                            isActivePlan
                                ? t(transKeys.pricing.buttons.currentPlan)
                                : t(transKeys.pricing.buttons.manageSubscription)
                        )}
                    </Button>
                </div>
                <div className="flex flex-col gap-2 h-42">
                    {planData.features.map((feature) => (
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
