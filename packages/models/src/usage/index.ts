export enum UsagePlanType {
    BASIC = 'basic',
    PRO = 'pro',
}

export interface UserUsage {
    id: number;
    user_id: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    daily_requests_count: number;
    monthly_requests_count: number;
    plan_id: number;
    created_at: string;
    updated_at: string;
    cancelled: boolean;
}

export interface UsagePlan {
    id: number;
    name: UsagePlanType;
    daily_requests_limit: number;
    monthly_requests_limit: number;
    stripe_price_id: string;
    stripe_product_id: string;
    is_free: boolean;
}
