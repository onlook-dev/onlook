import { transKeys } from '@/i18n/keys';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const ENTERPRISE_TIER = {
    name: 'Enterprise',
    price: 'Custom pricing',
    description: 'Tailored solutions for large organizations with advanced needs.',
    features: [
        'Everything in Pro',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced analytics',
        '24/7 premium support',
        'Custom SLA',
        'On-premise deployment options'
    ],
};

export const EnterpriseCard = ({
    delay,
}: {
    delay: number;
}) => {
    const t = useTranslations();

    const handleContactUs = () => {
        window.location.href = 'mailto:daniel@onlook.com';
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
                    <h2 className="text-title2">{ENTERPRISE_TIER.name}</h2>
                    <p className="text-foreground-onlook text-largePlus">{ENTERPRISE_TIER.price}</p>
                </div>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <p className="text-foreground-primary text-title3 text-balance">{ENTERPRISE_TIER.description}</p>
                <div className="border-[0.5px] border-border-primary -mx-6 my-6" />
                <div className="flex flex-col gap-2 mb-6">
                    <Button
                        className="w-full"
                        onClick={handleContactUs}
                    >
                        Contact Us
                    </Button>
                </div>
                <div className="flex flex-col gap-2 h-42">
                    {ENTERPRISE_TIER.features.map((feature) => (
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
