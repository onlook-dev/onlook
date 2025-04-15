import { UsagePlanType } from '@onlook/models/usage';
import { makeAutoObservable } from 'mobx';

export class SubscriptionManager {
    plan: UsagePlanType = UsagePlanType.BASIC;

    constructor() {
        makeAutoObservable(this);
        this.restoreCachedPlan();
        this.getPlanFromServer();
    }

    private restoreCachedPlan() {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return;
        }
        const cachedPlan = window.localStorage?.getItem('currentPlan');
        this.plan = (cachedPlan as UsagePlanType) || UsagePlanType.BASIC;
    }

    async updatePlan(plan: UsagePlanType) {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return;
        }
        this.plan = plan;
        window.localStorage.setItem('currentPlan', plan);
        // await invokeMainChannel(MainChannels.UPDATE_USER_METADATA, { plan });
    }

    async getPlanFromServer(): Promise<UsagePlanType> {
        // try {
        //     const res:
        //         | {
        //               success: boolean;
        //               error?: string;
        //               data?: any;
        //           }
        //         | undefined = await invokeMainChannel(MainChannels.CHECK_SUBSCRIPTION);
        //     if (!res?.success) {
        //         throw new Error(res?.error || 'Error checking premium status');
        //     }
        //     const newPlan = res.data.name === 'pro' ? UsagePlanType.PRO : UsagePlanType.BASIC;
        //     await this.updatePlan(newPlan);
        //     return newPlan;
        // } catch (error) {
        //     console.error('Error checking premium status:', error);
        //     return UsagePlanType.BASIC;
        // }
    }
}
