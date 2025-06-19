import { api } from '@/trpc/client';
import { type Subscription, type Usage } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

interface UsageMetrics {
    daily: Usage;
    monthly: Usage;
}

export class SubscriptionManager {
    subscription: Subscription | null = null;
    usage: UsageMetrics = {
        daily: {
            period: 'day',
            usageCount: 0,
            limitCount: 0,
        },
        monthly: {
            period: 'month',
            usageCount: 0,
            limitCount: 0,
        },
    }

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);
        reaction(
            () => this.userManager.user,
            (user) => {
                if (user) {
                    this.getSubscriptionFromRemote();
                }
            }
        );
    }

    async getSubscriptionFromRemote(): Promise<Subscription | null> {
        const subscription = await api.subscription.get.query();
        if (!subscription) {
            console.error('No subscription returned from remote');
            return null;
        }
        this.subscription = subscription;
        return subscription;
    }

    async getUsageFromRemote(): Promise<UsageMetrics | null> {
        const usage = await api.subscription.getUsage.query();
        if (!usage) {
            return null;
        }
        this.usage = usage;
        return usage;
    }
}
