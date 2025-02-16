import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import type { ChatSettings, UserSettings } from '@onlook/models/settings';
import { UsagePlanType } from '@onlook/models/usage';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class UserManager {
    settings: UserSettings | null = null;
    currentPlan: UsagePlanType = UsagePlanType.BASIC;

    constructor() {
        makeAutoObservable(this);
        this.restoreSettings();
        this.restoreCachedPlan();
    }

    private restoreCachedPlan() {
        const cachedPlan = localStorage.getItem('currentPlan');
        this.currentPlan = (cachedPlan as UsagePlanType) || UsagePlanType.BASIC;
    }

    async updatePlan(plan: UsagePlanType) {
        this.currentPlan = plan;
        localStorage.setItem('currentPlan', plan);
        await invokeMainChannel(MainChannels.UPDATE_USER_METADATA, { plan });
    }

    async checkPremiumStatus(): Promise<boolean> {
        try {
            const res:
                | {
                      success: boolean;
                      error?: string;
                      data?: any;
                  }
                | undefined = await invokeMainChannel(MainChannels.CHECK_SUBSCRIPTION);
            if (res?.success) {
                const newPlan = res.data.name === 'pro' ? UsagePlanType.PRO : UsagePlanType.BASIC;
                await this.updatePlan(newPlan);
                return res.data.name === 'pro';
            }
            return false;
        } catch (error) {
            console.error('Error checking premium status:', error);
            return false;
        }
    }

    async restoreSettings() {
        this.settings = await invokeMainChannel(MainChannels.GET_USER_SETTINGS);
    }

    async updateSettings(settings: Partial<UserSettings>) {
        this.settings = { ...this.settings, ...settings };
        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, settings);
    }

    async updateChatSettings(newSettings: Partial<ChatSettings>) {
        const newChatSettings = {
            ...DefaultSettings.CHAT_SETTINGS,
            ...this.settings?.chatSettings,
            ...newSettings,
        };

        this.settings = {
            ...this.settings,
            chatSettings: newChatSettings,
        };

        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, {
            chatSettings: newChatSettings,
        });
    }
}
