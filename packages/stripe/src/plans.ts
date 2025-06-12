import Stripe from 'stripe';

export enum PlanKey {
    PRO = 'pro',
}

export const PLANS: Record<PlanKey, { name: string; tiers: Stripe.PriceCreateParams.Tier[] }> = {
    [PlanKey.PRO]: {
        name: 'Onlook Pro',
        tiers: [
            { up_to: 100, unit_amount: 2000 },
            { up_to: 200, unit_amount: 4000 },
            { up_to: 400, unit_amount: 8000 },
            { up_to: 800, unit_amount: 16000 },
            { up_to: 1200, unit_amount: 24000 },
            { up_to: 'inf', unit_amount: 24000 },
        ] satisfies Stripe.PriceCreateParams.Tier[],
    },
};
