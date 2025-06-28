import { makeAutoObservable } from 'mobx';

export class StateManager {
    isSubscriptionModalOpen = false;

    constructor() {
        makeAutoObservable(this);
    }
}