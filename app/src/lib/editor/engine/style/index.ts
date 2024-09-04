import { ActionManager } from '../action';
import { ElementManager } from '../element';
import { ActionTargetWithSelector, Change } from '/common/actions';

export class StyleManager {
    constructor(
        private action: ActionManager,
        private elements: ElementManager,
    ) {}

    updateElementStyle(style: string, change: Change<string>) {
        const targets: Array<ActionTargetWithSelector> = this.elements.selected.map((s) => ({
            webviewId: s.webviewId,
            selector: s.selector,
        }));
        this.action.run({
            type: 'update-style',
            targets: targets,
            style: style,
            change: change,
        });
    }
}
