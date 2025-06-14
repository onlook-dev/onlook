'use client';

import { Button } from '@onlook/ui/button';
import { MotionCard } from '@onlook/ui/motion-card';
import { Icons } from '@onlook/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@onlook/ui/select';

import { useState } from 'react';

interface TokenTier {
    tokens: string;
    price: number;
    label: string;
}

export interface PricingCardProps {
    plan: string;
    basePrice: string;
    description: string;
    features: string[];
    buttonText: string;
    tokenTiers?: TokenTier[];
}

export function PricingCard({ plan, basePrice, description, features, buttonText, tokenTiers }: PricingCardProps) {
    const [selectedTier, setSelectedTier] = useState<TokenTier | null>(
        tokenTiers?.[0] || null
    );

    const displayPrice = selectedTier ? `$${selectedTier.price}` : basePrice;
    const priceSuffix = plan === 'Teams' ? '/member / month' : '/month';
    const billingText = plan === 'Free' ? 'Never billed!' : 'Billed monthly';

    return (
        <MotionCard className="flex flex-col p-6 pb-8 h-full bg-card border border-border">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-medium text-foreground">{plan}</h2>
                    {plan === 'Pro' && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                            POPULAR
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <p className="text-[40px] font-medium flex items-baseline text-foreground">
                        <span>{displayPrice}</span>
                        <span className="text-[18px] font-normal ml-1 text-muted-foreground">{priceSuffix}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{billingText}</p>
                </div>
                {tokenTiers && (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-foreground">
                            {plan === 'Teams' ? 'Get more tokens per member' : 'Get more tokens'}
                        </p>
                        <Select
                            value={selectedTier?.tokens}
                            onValueChange={(value) => {
                                const tier = tokenTiers.find(t => t.tokens === value);
                                setSelectedTier(tier || null);
                            }}
                        >
                            <SelectTrigger className="w-full bg-background border-border">
                                <SelectValue placeholder={selectedTier?.label} />
                            </SelectTrigger>
                            <SelectContent>
                                {tokenTiers.map((tier) => (
                                    <SelectItem key={tier.tokens} value={tier.tokens}>
                                        <div className="flex justify-between items-center w-full">
                                            <span>{tier.label}</span>
                                            <span className="ml-auto">${tier.price}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {!tokenTiers && plan === 'Free' && (
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-foreground">Monthly tokens</p>
                        <div className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                            <span className="text-sm">1M tokens / month</span>
                            <span className="text-xs text-muted-foreground">150K daily limit</span>
                        </div>
                    </div>
                )}
            </div>
            <p className="text-muted-foreground text-sm mt-4 mb-6 flex-grow-0">{description}</p>
            <Button className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white">
                {buttonText}
            </Button>
            <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-foreground">You get:</p>
                {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-foreground">
                        <Icons.Check className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                    </div>
                ))}
                {plan === 'Teams' && (
                    <div className="flex items-start gap-3 text-sm text-foreground">
                        <Icons.Check className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>You get everything in Pro, plus:</span>
                    </div>
                )}
            </div>
        </MotionCard>
    );
}
