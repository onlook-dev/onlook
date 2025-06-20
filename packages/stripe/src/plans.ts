import { PlanType } from "@onlook/models";

export enum ProTier {
    TIER_1 = 'TIER_1',
    TIER_2 = 'TIER_2',
    TIER_3 = 'TIER_3',
    TIER_4 = 'TIER_4',
    TIER_5 = 'TIER_5',
    TIER_6 = 'TIER_6',
    TIER_7 = 'TIER_7',
    TIER_8 = 'TIER_8',
    TIER_9 = 'TIER_9',
    TIER_10 = 'TIER_10',
    TIER_11 = 'TIER_11',
}

export interface TierConfig {
    key: ProTier,
    type: PlanType,
    description: string,
    limit: number | 'inf'
    monthlyPrice: number
    yearlyPrice: number
}

const ANNUAL_DISCOUNT = 0.9;

const calculateYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * ANNUAL_DISCOUNT);
}

export const PRO_TIERS: TierConfig[] = [
    { description: '100 Messages per Month', key: ProTier.TIER_1, type: PlanType.PRO, limit: 100, monthlyPrice: 2500, yearlyPrice: calculateYearlyPrice(2500) },
    { description: '200 Messages per Month', key: ProTier.TIER_2, type: PlanType.PRO, limit: 200, monthlyPrice: 5000, yearlyPrice: calculateYearlyPrice(5000) },
    { description: '400 Messages per Month', key: ProTier.TIER_3, type: PlanType.PRO, limit: 400, monthlyPrice: 10000, yearlyPrice: calculateYearlyPrice(10000) },
    { description: '800 Messages per Month', key: ProTier.TIER_4, type: PlanType.PRO, limit: 800, monthlyPrice: 20000, yearlyPrice: calculateYearlyPrice(20000) },
    { description: '1,200 Messages per Month', key: ProTier.TIER_5, type: PlanType.PRO, limit: 1200, monthlyPrice: 29400, yearlyPrice: calculateYearlyPrice(29400) },
    { description: '2,000 Messages per Month', key: ProTier.TIER_6, type: PlanType.PRO, limit: 2000, monthlyPrice: 48000, yearlyPrice: calculateYearlyPrice(48000) },
    { description: '3,000 Messages per Month', key: ProTier.TIER_7, type: PlanType.PRO, limit: 3000, monthlyPrice: 70500, yearlyPrice: calculateYearlyPrice(70500) },
    { description: '4,000 Messages per Month', key: ProTier.TIER_8, type: PlanType.PRO, limit: 4000, monthlyPrice: 92000, yearlyPrice: calculateYearlyPrice(92000) },
    { description: '5,000 Messages per Month', key: ProTier.TIER_9, type: PlanType.PRO, limit: 5000, monthlyPrice: 112500, yearlyPrice: calculateYearlyPrice(112500) },
    { description: '7,500 Messages per Month', key: ProTier.TIER_10, type: PlanType.PRO, limit: 7500, monthlyPrice: 187500, yearlyPrice: calculateYearlyPrice(187500) },
    { description: 'Unlimited Messages per Month', key: ProTier.TIER_11, type: PlanType.PRO, limit: 'inf', monthlyPrice: 375000, yearlyPrice: calculateYearlyPrice(375000) },
]

export const PRO_PRODUCT_CONFIG = {
    name: 'Onlook Pro',
    tiers: PRO_TIERS,
}