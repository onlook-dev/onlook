import { makeAutoObservable, reaction } from 'mobx';
import { ActionManager } from '../action';
import { ElementManager } from '../element';
import { ActionTargetWithSelector, Change } from '/common/actions';
import { DomElement } from '/common/models/element';

export interface SelectedStyle {
    styles: Record<string, string>;
    parentRect: DOMRect;
    rect: DOMRect;
}

export class StyleManager {
    selectorToStyle: Map<string, SelectedStyle> = new Map();
    private selectedElementsDisposer: () => void;

    constructor(
        private action: ActionManager,
        private elements: ElementManager,
    ) {
        makeAutoObservable(this);

        this.selectedElementsDisposer = reaction(
            () => this.elements.selected,
            (selectedElements) => this.onSelectedElementsChanged(selectedElements),
        );
    }

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

    private onSelectedElementsChanged(selectedElements: DomElement[]) {
        const newSelectedStyles = new Map<string, SelectedStyle>();
        for (const selectedEl of selectedElements) {
            const selectedStyle: SelectedStyle = {
                styles: selectedEl.styles,
                parentRect: selectedEl?.parent?.rect ?? ({} as DOMRect),
                rect: selectedEl?.rect ?? ({} as DOMRect),
            };
            newSelectedStyles.set(selectedEl.selector, selectedStyle);
        }
        this.selectorToStyle = newSelectedStyles;
    }

    dispose() {
        this.selectedElementsDisposer();
    }
}
