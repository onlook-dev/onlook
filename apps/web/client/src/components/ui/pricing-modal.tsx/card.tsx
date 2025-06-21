import { transKeys } from '@/i18n/keys';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export const PricingCard = ({
    plan,
    price,
    description,
    features,
    buttonText,
    buttonProps,
    delay,
    isLoading,
    defaultSelectValue,
    selectValues,
    disableSelect,
}: {
    plan: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
    delay: number;
    isLoading?: boolean;
    defaultSelectValue?: string;
    disableSelect?: boolean;
    selectValues: {
        value: string;
        label: string;
    }[];
}) => {
    const t = useTranslations();

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
                <div className="flex flex-col gap-2 mb-6">
                    <Select value={defaultSelectValue} disabled={disableSelect}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent className="z-99">
                            <SelectGroup>
                                {selectValues.map((value) => (
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
                    {features.map((feature, i) => (
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
