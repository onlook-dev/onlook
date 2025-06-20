import { ProductType } from "./types";

export enum ProPrice {
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

export interface PriceConfig {
    key: ProPrice,
    name: string,
    product: ProductType,
    description: string,
    monthlyMessageLimit: number | 'inf'
    monthlyPrice: number
    yearlyPrice: number
}

const ANNUAL_DISCOUNT = 0.9;

const calculateYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * ANNUAL_DISCOUNT);
}

export const PRO_TIERS: PriceConfig[] = [
    { description: '100 Messages per Month', key: ProPrice.TIER_1, name: 'Tier 1', product: ProductType.PRO, monthlyMessageLimit: 100, monthlyPrice: 2500, yearlyPrice: calculateYearlyPrice(2500) },
    { description: '200 Messages per Month', key: ProPrice.TIER_2, name: 'Tier 2', product: ProductType.PRO, monthlyMessageLimit: 200, monthlyPrice: 5000, yearlyPrice: calculateYearlyPrice(5000) },
    { description: '400 Messages per Month', key: ProPrice.TIER_3, name: 'Tier 3', product: ProductType.PRO, monthlyMessageLimit: 400, monthlyPrice: 10000, yearlyPrice: calculateYearlyPrice(10000) },
    { description: '800 Messages per Month', key: ProPrice.TIER_4, name: 'Tier 4', product: ProductType.PRO, monthlyMessageLimit: 800, monthlyPrice: 20000, yearlyPrice: calculateYearlyPrice(20000) },
    { description: '1,200 Messages per Month', key: ProPrice.TIER_5, name: 'Tier 5', product: ProductType.PRO, monthlyMessageLimit: 1200, monthlyPrice: 29400, yearlyPrice: calculateYearlyPrice(29400) },
    { description: '2,000 Messages per Month', key: ProPrice.TIER_6, name: 'Tier 6', product: ProductType.PRO, monthlyMessageLimit: 2000, monthlyPrice: 48000, yearlyPrice: calculateYearlyPrice(48000) },
    { description: '3,000 Messages per Month', key: ProPrice.TIER_7, name: 'Tier 7', product: ProductType.PRO, monthlyMessageLimit: 3000, monthlyPrice: 70500, yearlyPrice: calculateYearlyPrice(70500) },
    { description: '4,000 Messages per Month', key: ProPrice.TIER_8, name: 'Tier 8', product: ProductType.PRO, monthlyMessageLimit: 4000, monthlyPrice: 92000, yearlyPrice: calculateYearlyPrice(92000) },
    { description: '5,000 Messages per Month', key: ProPrice.TIER_9, name: 'Tier 9', product: ProductType.PRO, monthlyMessageLimit: 5000, monthlyPrice: 112500, yearlyPrice: calculateYearlyPrice(112500) },
    { description: '7,500 Messages per Month', key: ProPrice.TIER_10, name: 'Tier 10', product: ProductType.PRO, monthlyMessageLimit: 7500, monthlyPrice: 187500, yearlyPrice: calculateYearlyPrice(187500) },
    { description: 'Unlimited Messages per Month', key: ProPrice.TIER_11, name: 'Tier 11', product: ProductType.PRO, monthlyMessageLimit: 'inf', monthlyPrice: 375000, yearlyPrice: calculateYearlyPrice(375000) },
]

export const PRO_PRODUCT_CONFIG = {
    name: 'Onlook Pro',
    tiers: PRO_TIERS,
}