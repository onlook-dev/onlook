import { api } from '@/trpc/client';
import { type Usage } from '@onlook/models';
import type { Subscription } from '@onlook/stripe';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

interface UsageMetrics {
    daily: Usage;
    monthly: Usage;
}

export class SubscriptionManager {
    isModalOpen = false;
    _subscription: Subscription | null = null;
    _usage: UsageMetrics | null = null

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

    get subscription() {
        if (!this._subscription) {
            this.getSubscriptionFromRemote();
        }
        return this._subscription;
    }

    get usage() {
        if (!this._usage) {
            this.getUsageFromRemote();
        }
        return this._usage;
    }

    async getSubscriptionFromRemote(): Promise<Subscription | null> {
        const subscription = await api.subscription.get.query();
        if (!subscription) {
            console.error('No subscription returned from remote');
            return null;
        }
        this._subscription = subscription;
        return subscription;
    }

    async getUsageFromRemote(): Promise<UsageMetrics | null> {
        const usage = await api.usage.get.query();
        if (!usage) {
            return null;
        }
        this._usage = usage;
        return usage;
    }

    clear() {
        this.isModalOpen = false;
        this._subscription = null;
        this._usage = null;
    }
}
