export enum ProTier {
    TIER_1 = '100 monthly messages',
    TIER_2 = '200 monthly messages',
    TIER_3 = '400 monthly messages',
    TIER_4 = '800 monthly messages',
    TIER_5 = '1200 monthly messages',
    TIER_6 = '2000 monthly messages',
    TIER_7 = '3000 monthly messages',
    TIER_8 = '4000 monthly messages',
    TIER_9 = '5000 monthly messages',
    TIER_10 = '7500 monthly messages',
    TIER_11 = '10000+ monthly messages',
}

export interface TierConfig {
    name: ProTier
    limit: number | 'inf'
    monthly: number        // in cents
    yearly: number         // in cents
}

const ANNUAL_DISCOUNT = 0.9;

export const PRO_TIERS: TierConfig[] = [
    { name: ProTier.TIER_1, limit: 100, monthly: 2500, yearly: 2500 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_2, limit: 200, monthly: 5000, yearly: 5000 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_3, limit: 400, monthly: 10000, yearly: 10000 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_4, limit: 800, monthly: 20000, yearly: 20000 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_5, limit: 1200, monthly: 29400, yearly: 29400 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_6, limit: 2000, monthly: 48000, yearly: 48000 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_7, limit: 3000, monthly: 70500, yearly: 70500 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_8, limit: 4000, monthly: 92000, yearly: 92000 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_9, limit: 5000, monthly: 112500, yearly: 112500 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_10, limit: 7500, monthly: 187500, yearly: 187500 * 12 * ANNUAL_DISCOUNT },
    { name: ProTier.TIER_11, limit: 'inf', monthly: 375000, yearly: 375000 * 12 * ANNUAL_DISCOUNT },
]

export const PRO_PRODUCT_CONFIG = {
    name: 'Onlook Pro',
    tiers: PRO_TIERS,
}