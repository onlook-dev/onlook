import { makeAutoObservable } from 'mobx';
import { sendAnalytics } from '../utils';

export enum Route {
    EDITOR = 'editor',
    SIGN_IN = 'signin',
    PROJECTS = 'projects',
    REQUIREMENTS = 'requirements',
}

export class RouteManager {
    private currentRoute: Route = Route.PROJECTS;

    constructor() {
        makeAutoObservable(this);
    }

    get route() {
        return this.currentRoute;
    }

    set route(newRoute: Route) {
        if (newRoute === this.currentRoute) {
            return;
        }
        this.currentRoute = newRoute;
        sendAnalytics('navigate', { route: newRoute });
    }
}
