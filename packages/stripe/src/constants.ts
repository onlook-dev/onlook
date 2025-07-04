import { ProductType } from "./types";

export enum PriceKey {
    PRO_MONTHLY_TIER_1 = 'PRO_MONTHLY_TIER_1',
    PRO_MONTHLY_TIER_2 = 'PRO_MONTHLY_TIER_2',
    PRO_MONTHLY_TIER_3 = 'PRO_MONTHLY_TIER_3',
    PRO_MONTHLY_TIER_4 = 'PRO_MONTHLY_TIER_4',
    PRO_MONTHLY_TIER_5 = 'PRO_MONTHLY_TIER_5',
    PRO_MONTHLY_TIER_6 = 'PRO_MONTHLY_TIER_6',
    PRO_MONTHLY_TIER_7 = 'PRO_MONTHLY_TIER_7',
    PRO_MONTHLY_TIER_8 = 'PRO_MONTHLY_TIER_8',
    PRO_MONTHLY_TIER_9 = 'PRO_MONTHLY_TIER_9',
    PRO_MONTHLY_TIER_10 = 'PRO_MONTHLY_TIER_10',
    PRO_MONTHLY_TIER_11 = 'PRO_MONTHLY_TIER_11',
}

export interface PriceConfig {
    key: PriceKey,
    name: string,
    product: ProductType,
    description: string,
    monthlyMessageLimit: number
    cost: number
    paymentInterval: 'month' | 'year'
}

export const PRO_PRICES: PriceConfig[] = [
    { description: '100 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_1, name: 'Tier 1', product: ProductType.PRO, monthlyMessageLimit: 100, cost: 2500, paymentInterval: 'month' },
    { description: '200 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_2, name: 'Tier 2', product: ProductType.PRO, monthlyMessageLimit: 200, cost: 5000, paymentInterval: 'month' },
    { description: '400 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_3, name: 'Tier 3', product: ProductType.PRO, monthlyMessageLimit: 400, cost: 10000, paymentInterval: 'month' },
    { description: '800 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_4, name: 'Tier 4', product: ProductType.PRO, monthlyMessageLimit: 800, cost: 20000, paymentInterval: 'month' },
    { description: '1,200 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_5, name: 'Tier 5', product: ProductType.PRO, monthlyMessageLimit: 1200, cost: 29400, paymentInterval: 'month' },
    { description: '2,000 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_6, name: 'Tier 6', product: ProductType.PRO, monthlyMessageLimit: 2000, cost: 48000, paymentInterval: 'month' },
    { description: '3,000 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_7, name: 'Tier 7', product: ProductType.PRO, monthlyMessageLimit: 3000, cost: 70500, paymentInterval: 'month' },
    { description: '4,000 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_8, name: 'Tier 8', product: ProductType.PRO, monthlyMessageLimit: 4000, cost: 92000, paymentInterval: 'month' },
    { description: '5,000 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_9, name: 'Tier 9', product: ProductType.PRO, monthlyMessageLimit: 5000, cost: 112500, paymentInterval: 'month' },
    { description: '7,500 Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_10, name: 'Tier 10', product: ProductType.PRO, monthlyMessageLimit: 7500, cost: 187500, paymentInterval: 'month' },
    { description: 'Unlimited Messages per Month', key: PriceKey.PRO_MONTHLY_TIER_11, name: 'Tier 11', product: ProductType.PRO, monthlyMessageLimit: 99999, cost: 375000, paymentInterval: 'month' },
]

export const PRO_PRODUCT_CONFIG = {
    name: 'Onlook Pro',
    prices: PRO_PRICES,
}

export const FREE_PRODUCT_CONFIG = {
    name: 'Free',
    type: ProductType.FREE,
    stripeProductId: '',
    dailyLimit: 5,
    monthlyLimit: 50,
};