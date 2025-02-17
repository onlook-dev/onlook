import { MainChannels } from '@onlook/models/constants';
import { UsagePlanType } from '@onlook/models/usage';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class SubscriptionManager {
    plan: UsagePlanType = UsagePlanType.BASIC;

    constructor() {
        makeAutoObservable(this);
        this.restoreCachedPlan();
    }

    private restoreCachedPlan() {
        const cachedPlan = localStorage.getItem('currentPlan');
        this.plan = (cachedPlan as UsagePlanType) || UsagePlanType.BASIC;
    }

    async updatePlan(plan: UsagePlanType) {
        this.plan = plan;
        localStorage.setItem('currentPlan', plan);
        await invokeMainChannel(MainChannels.UPDATE_USER_METADATA, { plan });
    }

    async getPlanFromServer(): Promise<UsagePlanType> {
        try {
            const res:
                | {
                      success: boolean;
                      error?: string;
                      data?: any;
                  }
                | undefined = await invokeMainChannel(MainChannels.CHECK_SUBSCRIPTION);
            if (!res?.success) {
                throw new Error(res?.error || 'Error checking premium status');
            }
            const newPlan = res.data.name === 'pro' ? UsagePlanType.PRO : UsagePlanType.BASIC;
            await this.updatePlan(newPlan);
            return newPlan;
        } catch (error) {
            console.error('Error checking premium status:', error);
            return UsagePlanType.BASIC;
        }
    }
}
