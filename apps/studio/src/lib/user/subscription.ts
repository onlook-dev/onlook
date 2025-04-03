import { MainChannels } from '@onlook/models/constants';
import { UsagePlanType } from '@onlook/models/usage';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class SubscriptionManager {
    plan: UsagePlanType = UsagePlanType.PRO;

    constructor() {
        makeAutoObservable(this);
        this.restoreCachedPlan();
        this.getPlanFromServer();
    }

    private restoreCachedPlan() {
        const cachedPlan = localStorage.getItem('currentPlan');
        this.plan = UsagePlanType.PRO;
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

            // Determine plan type based on API response
            let newPlan = UsagePlanType.FREE;

            if (res.data && res.data.name) {
                switch (res.data.name) {
                    case 'pro':
                        newPlan = UsagePlanType.PRO;
                        break;
                    case 'launch':
                        newPlan = UsagePlanType.LAUNCH;
                        break;
                    case 'scale':
                        newPlan = UsagePlanType.SCALE;
                        break;
                    default:
                        newPlan = UsagePlanType.FREE;
                }
            }

            await this.updatePlan(newPlan);
            return newPlan;
        } catch (error) {
            console.error('Error checking premium status:', error);
            return UsagePlanType.FREE;
        }
    }
}
