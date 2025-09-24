import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';

const ENTERPRISE_TIER = {
    name: 'Enterprise',
    price: 'Custom pricing',
    description: 'Supercharge your team with the power of AI',
    features: [
        'Custom integrations',
        'On-premise deployment options',
        'Usage analytics',
        'Branching',
        '24/7 premium support',
        'Custom SLA',
    ],
};

export const EnterpriseCard = ({ delay }: { delay: number }) => {
    const t = useTranslations();

    const handleContactUs = () => {
        const subject = encodeURIComponent('[Enterprise]: Onlook Enterprise Inquiry');
        const body = encodeURIComponent(`Hi Daniel,

I'm interested in learning more about Onlook's enterprise offering for our organization.

Looking forward to hearing from you.

Best regards,
[Your name]`);

        window.location.href = `mailto:daniel@onlook.com?subject=${subject}&body=${body}`;
    };

    return (
        <MotionCard
            className="w-[360px]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <motion.div className="flex h-full flex-col p-6">
                <div className="space-y-1">
                    <h2 className="text-title2">{ENTERPRISE_TIER.name}</h2>
                    <p className="text-foreground-onlook text-largePlus">{ENTERPRISE_TIER.price}</p>
                </div>
                <div className="border-border-primary -mx-6 my-6 border-[0.5px]" />
                <p className="text-foreground-primary text-title3 text-balance">
                    {ENTERPRISE_TIER.description}
                </p>
                <div className="border-border-primary -mx-6 my-6 border-[0.5px]" />
                <div className="mb-6 flex flex-col gap-2">
                    <Button className="w-full" onClick={handleContactUs}>
                        Contact Us
                    </Button>
                </div>
                <div className="flex h-42 flex-col gap-2">
                    {ENTERPRISE_TIER.features.map((feature) => (
                        <div
                            key={feature}
                            className="text-foreground-secondary/80 flex items-center gap-3 text-sm"
                        >
                            <Icons.CheckCircled className="text-foreground-secondary/80 h-5 w-5" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </MotionCard>
    );
};
