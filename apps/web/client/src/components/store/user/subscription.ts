import { PlanKey } from '@onlook/stripe';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

export class SubscriptionManager {
    plan: PlanKey = PlanKey.FREE;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);
        reaction(
            () => this.userManager.user,
            (user) => {
                if (user) {
                    this.getPlanFromServer();
                }
            }
        );
    }

    async updatePlan(plan: PlanKey) {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            console.error('window or localStorage is undefined');
            return;
        }
        this.plan = plan;
        window.localStorage.setItem('currentPlan', plan);
        // await invokeMainChannel(MainChannels.UPDATE_USER_METADATA, { plan });
    }

    async getPlanFromServer(): Promise<void> {
        this.plan = PlanKey.FREE;
    }
}
