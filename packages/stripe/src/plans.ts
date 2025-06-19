export enum ProTier {
    TIER_1 = '100 Messages per Month',
    TIER_2 = '200 Messages per Month',
    TIER_3 = '400 Messages per Month',
    TIER_4 = '800 Messages per Month',
    TIER_5 = '1,200 Messages per Month',
    TIER_6 = '2,000 Messages per Month',
    TIER_7 = '3,000 Messages per Month',
    TIER_8 = '4,000 Messages per Month',
    TIER_9 = '5,000 Messages per Month',
    TIER_10 = '7,500 Messages per Month',
    TIER_11 = 'Unlimited Messages per Month',
}

export interface TierConfig {
    name: ProTier
    limit: number | 'inf'
    monthly: number        // in cents
    yearly: number         // in cents
}

const ANNUAL_DISCOUNT = 0.9;

export const PRO_TIERS: TierConfig[] = [
    { name: ProTier.TIER_1, limit: 100, monthly: 2500, yearly: Math.round(2500 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_2, limit: 200, monthly: 5000, yearly: Math.round(5000 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_3, limit: 400, monthly: 10000, yearly: Math.round(10000 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_4, limit: 800, monthly: 20000, yearly: Math.round(20000 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_5, limit: 1200, monthly: 29400, yearly: Math.round(29400 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_6, limit: 2000, monthly: 48000, yearly: Math.round(48000 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_7, limit: 3000, monthly: 70500, yearly: Math.round(70500 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_8, limit: 4000, monthly: 92000, yearly: Math.round(92000 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_9, limit: 5000, monthly: 112500, yearly: Math.round(112500 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_10, limit: 7500, monthly: 187500, yearly: Math.round(187500 * 12 * ANNUAL_DISCOUNT) },
    { name: ProTier.TIER_11, limit: 'inf', monthly: 375000, yearly: Math.round(375000 * 12 * ANNUAL_DISCOUNT) },
]

export const PRO_PRODUCT_CONFIG = {
    name: 'Onlook Pro',
    tiers: PRO_TIERS,
}