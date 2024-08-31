import type { ReactComponentDescriptor } from '/electron/main/code/components';

export class ProjectInfoManager {
    private projectComponents: ReactComponentDescriptor[];
    constructor() {
        this.projectComponents = [];
    }

    get components() {
        return this.projectComponents;
    }

    set components(newComponents: ReactComponentDescriptor[]) {
        this.projectComponents = newComponents;
    }
}
