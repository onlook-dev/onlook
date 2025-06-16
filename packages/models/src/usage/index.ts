export interface MessageLimitCheckResult {
    exceeded: boolean;
    period: 'daily' | 'monthly';
    count: number;
    limit: number;
}
