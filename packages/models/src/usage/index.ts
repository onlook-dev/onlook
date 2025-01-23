export interface UsagePlan {
    id: number;
    name: string;
    daily_requests_limit: number;
    monthly_requests_limit: number;
    stripe_price_id: string | null;
    stripe_product_id: string | null;
    created_at: string;
    updated_at: string;
    is_free: boolean;
}

export interface UserUsage {
    id: number;
    user_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    requests_count: number;
    plan_id: number;
    created_at: string;
    cancelled: boolean;
}

export type UsagePlanType = 'basic' | 'pro';
