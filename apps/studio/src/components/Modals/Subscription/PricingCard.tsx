import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export const PricingCard = ({
    plan,
    price,
    description,
    features,
    buttonText,
    buttonProps,
    delay,
    isLoading,
}: {
    plan: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
    delay: number;
    isLoading?: boolean;
}) => {
    const { t } = useTranslation();

    return (
        <MotionCard
            className="w-[360px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <motion.div className="p-6 flex flex-col h-full">
                <div className="space-y-1">
                    <h2 className="text-title2">{plan}</h2>
                    <p className="text-foreground-onlook text-largePlus">{price}</p>
                </div>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <p className="text-foreground-primary text-title3 text-balance">{description}</p>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <div className="space-y-4 mb-6">
                    {features.map((feature, i) => (
                        <div
                            key={feature}
                            className="flex items-center gap-3 text-sm text-foreground-secondary/80"
                        >
                            <Icons.Check className="w-5 h-5 text-foreground-secondary/80" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
                <Button
                    className="mt-auto w-full"
                    {...buttonProps}
                    disabled={isLoading || buttonProps.disabled}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Icons.Shadow className="w-4 h-4 animate-spin" />
                            <span>{t('pricing.loading.checkingPayment')}</span>
                        </div>
                    ) : (
                        buttonText
                    )}
                </Button>
            </motion.div>
        </MotionCard>
    );
};
