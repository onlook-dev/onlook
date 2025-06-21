import { type Usage } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { UserManager } from './manager';

interface UsageMetrics {
    daily: Usage;
    monthly: Usage;
}

export class SubscriptionManager {
    isModalOpen = false;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);
    }

    clear() {
        this.isModalOpen = false;
    }
}
