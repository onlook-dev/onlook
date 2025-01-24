export interface UsageCheckResult {
    exceeded: boolean;
    reason: 'none' | 'daily' | 'monthly';
    daily_requests_count: number;
    monthly_requests_count: number;
    daily_requests_limit: number;
    monthly_requests_limit: number;
}

export type StreamResponse = {
    content: string;
    status: 'partial' | 'full' | 'error' | 'rate-limited';
    rateLimitResult?: UsageCheckResult;
};
