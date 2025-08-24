import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { ScheduledSubscriptionAction } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSubscription } from './use-subscription';

const FREE_TIER = {
    name: 'Free',
    price: '$0/month',
    description: 'Prototype and experiment in code with ease.',
    features: [
        'Visual code editor access',
        '5 projects',
        '5 AI chat messages a day',
        '15 AI messages a month',
        'Unlimited styling and code editing',
        'Limited to 1 screenshot per chat'
    ],
    defaultSelectValue: 'daily',
    selectValues: [
        { value: 'daily', label: '5 Daily Messages' },
    ],
};

export const FreeCard = ({
    delay,
    isUnauthenticated = false,
    onSignupClick,
}: {
    delay: number;
    isUnauthenticated?: boolean;
    onSignupClick?: () => void;
}) => {
    const t = useTranslations();
    const { subscription, isPro, setIsCheckingSubscription } = useSubscription();
    const { mutateAsync: manageSubscription } = api.subscription.manageSubscription.useMutation();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const isFree = !isPro;
    const isScheduledCancellation = subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION;

    const handleDowngradeToFree = async () => {
        try {
            setIsCheckingOut(true);
            const session = await manageSubscription();

            if (session?.url) {
                window.open(session.url, '_blank');
                setIsCheckingSubscription(true);
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

    const buttonContent = () => {
        if (isCheckingOut) {
            return (
                <div className="flex items-center gap-2">
                    <Icons.Shadow className="w-4 h-4 animate-spin" />
                    <span>{t(transKeys.pricing.loading.checkingPayment)}</span>
                </div>
            )
        }

        if (isUnauthenticated) {
            return "Get Started Free";
        }

        if (isScheduledCancellation) {
            return `Pro plan ends on ${subscription?.scheduledChange?.scheduledChangeAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
        }

        if (isFree) {
            return t(transKeys.pricing.buttons.currentPlan);
        }

        return "Downgrade to Free Plan";
    }

    const handleButtonClick = () => {
        if (isUnauthenticated && onSignupClick) {
            onSignupClick();
        } else {
            handleDowngradeToFree();
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
                    <h2 className="text-title2">{FREE_TIER.name}</h2>
                    <p className="text-foreground-onlook text-largePlus">{FREE_TIER.price}</p>
                </div>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <p className="text-foreground-primary text-title3 text-balance">{FREE_TIER.description}</p>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <div className="flex flex-col gap-2 mb-6">
                    <Select
                        value={FREE_TIER.defaultSelectValue}
                        disabled={true}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent className="z-99">
                            <SelectGroup>
                                {FREE_TIER.selectValues.map((value) => (
                                    <SelectItem key={value.value} value={value.value}>
                                        {value.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleButtonClick}
                        disabled={isCheckingOut || (!isUnauthenticated && (isFree || isScheduledCancellation))}
                    >
                        {buttonContent()}
                    </Button>
                </div>
                <div className="flex flex-col gap-2 h-42">
                    {FREE_TIER.features.map((feature) => (
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
