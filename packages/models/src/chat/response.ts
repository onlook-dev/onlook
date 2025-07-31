export interface Usage {
    period: 'day' | 'month';
    usageCount: number;
    limitCount: number;
}

export interface UsageResult {
    daily: Usage;
    monthly: Usage;
}
