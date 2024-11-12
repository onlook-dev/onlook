import { MainChannels } from '@onlook/models/constants';
import type { RequirementsResponse } from '@onlook/models/requirements';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class RequirementsManager {
    nodeEnabled: boolean | null = null;
    gitEnabled: boolean | null = null;
    interval: Timer | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    get loaded() {
        return this.nodeEnabled !== null && this.gitEnabled !== null;
    }

    get requirementsMet() {
        return this.nodeEnabled && this.gitEnabled;
    }

    async listen() {
        this.checkRequirements();
        this.interval = setInterval(() => {
            this.checkRequirements();
        }, 3000);
    }

    async checkRequirements() {
        if (this.requirementsMet && this.interval) {
            clearInterval(this.interval);
            return;
        }
        const requirements: RequirementsResponse | null = await invokeMainChannel(
            MainChannels.CHECK_REQUIREMENTS,
        );

        if (!requirements) {
            console.error('Failed to check requirements');
            return;
        }

        this.nodeEnabled = requirements.node;
        this.gitEnabled = requirements.git;
    }
}
