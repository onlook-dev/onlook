import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PricingCardProps {
    plan: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
    delay: number;
    isLoading?: boolean;
    className?: string;
    showFeaturesPrefix?: boolean;
    featuresPrefixText?: string;
    isRecommended?: boolean;
    isCurrentPlan?: boolean;
}

export const PricingCard = ({
    plan,
    price,
    description,
    features,
    buttonText,
    buttonProps,
    delay,
    isLoading,
    className,
    showFeaturesPrefix = false,
    featuresPrefixText = 'Everything in Pro plus:',
    isRecommended = false,
    isCurrentPlan = false,
}: PricingCardProps) => {
    const { t } = useTranslation();

    return (
        <div className="relative h-full">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay }}
                className="h-full"
            >
                {isRecommended && (
                    <div className="absolute -top-8 left-5 right-5">
                        <div
                            className="w-full py-1.5 text-center text-sm font-medium rounded-t-lg relative"
                            style={{
                                backdropFilter: 'blur(12px)',
                                backgroundColor: 'hsl(var(--background) /0.6)',
                                boxShadow: '0px 0px 0px 0.5px hsl(var(--foreground) /0.2)',
                                color: 'var(--card-foreground)',
                            }}
                        >
                            Recommended
                        </div>
                    </div>
                )}
                <MotionCard
                    className={`max-w-[420px] h-[680px] flex-shrink-0 flex ${className || ''}`}
                >
                    <motion.div className="p-5 pb-8 flex flex-col w-full h-full">
                        <div className="flex-shrink-0">
                            <h2 className="text-[18px] font-medium">{plan}</h2>
                            <p className="text-[40px] font-medium flex items-baseline">
                                <span>{price.split('/')[0]}</span>
                                <span className="text-[18px] font-normal ml-1 text-muted-foreground">
                                    /month
                                </span>
                            </p>
                        </div>
                        <p className="text-title3 font-normal text-balance text-muted-foreground mt-2 flex-shrink-0">
                            {description}
                        </p>
                        <Button
                            className={`w-full text-base font-medium mt-6 mb-2 h-12 flex-shrink-0 ${
                                isCurrentPlan ? 'bg-white/75' : ''
                            }`}
                            size="default"
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
                        <div className="h-[0.5px] bg-white/20 -mx-5 my-5 flex-shrink-0" />
                        <div className="space-y-3 mt-1 flex-grow overflow-y-auto">
                            {showFeaturesPrefix && (
                                <p className="text-base font-medium mb-2">{featuresPrefixText}</p>
                            )}
                            {features.map((feature, i) => (
                                <div
                                    key={feature}
                                    className="flex items-start gap-2 text-base text-foreground-secondary/80"
                                >
                                    <Icons.Check className="w-4 h-4 text-foreground-secondary/80 flex-shrink-0 mt-0.5" />
                                    <span className="text-balance">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </MotionCard>
            </motion.div>
        </div>
    );
};
