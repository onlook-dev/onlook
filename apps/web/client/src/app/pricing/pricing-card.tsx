'use client';

import { Button } from '@onlook/ui/button';
import { MotionCard } from '@onlook/ui/motion-card';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';

export interface PricingCardProps {
    plan: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
}

export function PricingCard({ plan, price, description, features, buttonText }: PricingCardProps) {
    return (
        <MotionCard className="flex flex-col p-5 pb-8 h-full">
            <motion.div className="flex flex-col gap-2">
                <h2 className="text-[18px] font-medium">{plan}</h2>
                <p className="text-[40px] font-medium flex items-baseline">
                    <span>{price.split('/')[0]}</span>
                    <span className="text-[18px] font-normal ml-1 text-muted-foreground">/month</span>
                </p>
            </motion.div>
            <p className="text-muted-foreground text-sm mt-2 mb-4 flex-grow-0">{description}</p>
            <div className="h-[0.5px] bg-white/20 -mx-5 my-5" />
            <div className="space-y-2 mb-6 flex-grow">
                {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-foreground-secondary/80">
                        <Icons.Check className="w-4 h-4 mt-0.5" />
                        <span className="text-balance">{feature}</span>
                    </div>
                ))}
            </div>
            <Button className="mt-auto">{buttonText}</Button>
        </MotionCard>
    );
}
