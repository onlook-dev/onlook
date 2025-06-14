import { api } from '@/trpc/client';
import { SubscriptionPlans } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

export class SubscriptionManager {
    plan: SubscriptionPlans = SubscriptionPlans.FREE;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);
        this.restoreCachedPlan();
        reaction(
            () => this.userManager.user,
            (user) => {
                if (user) {
                    this.getUserPlan();
                }
            }
        );
    }

    private restoreCachedPlan() {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            console.error('window or localStorage is undefined');
            return;
        }
        const cachedPlan = window.localStorage?.getItem('currentPlan');
        this.plan = (cachedPlan as SubscriptionPlans) || SubscriptionPlans.FREE;
    }

    async updatePlan(plan: SubscriptionPlans) {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            console.error('window or localStorage is undefined');
            return;
        }
        this.plan = plan;
        window.localStorage.setItem('currentPlan', plan);
        // await invokeMainChannel(MainChannels.UPDATE_USER_METADATA, { plan });
    }

    async getUserPlan(): Promise<SubscriptionPlans> {
        const plan = await api.subscription.userPlan.query();
        if (!plan) {
            return SubscriptionPlans.FREE;
        }
        this.updatePlan(plan.plan);
        return plan.plan.name;
    }
}
