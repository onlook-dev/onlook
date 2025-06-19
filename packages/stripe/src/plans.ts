import { PlanType } from '@onlook/models';
import Stripe from 'stripe';

export const PLANS: Record<PlanType, { name: string; tiers: Stripe.PriceCreateParams.Tier[] }> = {
    [PlanType.FREE]: {
        name: 'Onlook Free',
        tiers: [
            { up_to: 10, unit_amount: 0 },
        ] satisfies Stripe.PriceCreateParams.Tier[],
    },
    [PlanType.PRO]: {
        name: 'Onlook Pro',
        tiers: [
            { up_to: 100, unit_amount: 2500 },
            { up_to: 200, unit_amount: 5000 },
            { up_to: 400, unit_amount: 10000 },
            { up_to: 800, unit_amount: 20000 },
            { up_to: 1200, unit_amount: 29400 },
            { up_to: 2000, unit_amount: 48000 },
            { up_to: 3000, unit_amount: 70500 },
            { up_to: 4000, unit_amount: 92000 },
            { up_to: 5000, unit_amount: 112500 },
            { up_to: 7500, unit_amount: 187500 },
            { up_to: 10000, unit_amount: 250000 },
            { up_to: 'inf', unit_amount: 375000 },
        ] satisfies Stripe.PriceCreateParams.Tier[],
    },
};
