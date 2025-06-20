export enum PlanType {
    FREE = 'free',
    PRO = 'pro',
}

export interface Plan {
    name: string;
    type: PlanType;
    dailyMessages: number;
    monthlyMessages: number;
}

export interface Price {
    id: string;
    planId: string;
    pricePerMonth: number;
    stripePriceId: string;
}

export interface Subscription {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    plan: Plan;
}
