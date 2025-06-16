import Stripe from 'stripe';

export enum PlanKey {
    FREE = 'free',
    PRO = 'pro',
}

export const PLANS: Record<PlanKey, { name: string; tiers: Stripe.PriceCreateParams.Tier[] }> = {
    [PlanKey.FREE]: {
        name: 'Onlook Free',
        tiers: [
            { up_to: 10, unit_amount: 0 },
        ] satisfies Stripe.PriceCreateParams.Tier[],
    },
    [PlanKey.PRO]: {
        name: 'Onlook Pro',
        tiers: [
            { up_to: 100, unit_amount: 2000 },
            { up_to: 200, unit_amount: 4000 },
            { up_to: 400, unit_amount: 8000 },
            { up_to: 800, unit_amount: 16000 },
            { up_to: 1200, unit_amount: 24000 },
            { up_to: 2000, unit_amount: 40000 },
            { up_to: 3000, unit_amount: 60000 },
            { up_to: 4000, unit_amount: 80000 },
            { up_to: 5000, unit_amount: 100000 },
            { up_to: 7500, unit_amount: 140000 },
            { up_to: 10000, unit_amount: 200000 },
        ] satisfies Stripe.PriceCreateParams.Tier[],
    },
};
