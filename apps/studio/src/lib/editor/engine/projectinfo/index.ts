import { makeAutoObservable } from 'mobx';
import type { ReactComponentDescriptor } from '/electron/main/code/components';

export class ProjectInfoManager {
    private projectComponents: ReactComponentDescriptor[];
    private projectPages: string[];

    constructor() {
        makeAutoObservable(this);
        this.projectComponents = [];
        this.projectPages = [];
    }

    get components() {
        return this.projectComponents;
    }

    set components(newComponents: ReactComponentDescriptor[]) {
        this.projectComponents = newComponents;
    }

    get pages() {
        return this.projectPages;
    }

    set pages(newPages: string[]) {
        this.projectPages = newPages;
    }
}
