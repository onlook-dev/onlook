import { makeAutoObservable } from 'mobx';
import { sendAnalytics } from '../utils';

export enum Route {
    EDITOR = 'editor',
    LOGIN = 'login',
}

export class RouteManager {
    private currentRoute: Route = Route.EDITOR;

    constructor() {
        makeAutoObservable(this);
    }

    get route() {
        return this.currentRoute;
    }

    set route(newRoute: Route) {
        this.route = newRoute;
        sendAnalytics('navigate', { route: newRoute });
    }
}
