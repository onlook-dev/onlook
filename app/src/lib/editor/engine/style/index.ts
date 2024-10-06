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
    // Single. TODO: Remove
    // selectedStyle: SelectedStyle | null = null;

    // Multiple
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

        // TODO: This needs to get the correct original value for each target
        this.action.run({
            type: 'update-style',
            targets: targets,
            style: style,
            change: change,
        });

        this.updateStyleNoAction(style, change.updated);
    }

    updateStyleNoAction(style: string, value: string) {
        for (const [selector, selectedStyle] of this.selectorToStyle.entries()) {
            this.selectorToStyle.set(selector, {
                ...selectedStyle,
                styles: { ...selectedStyle.styles, [style]: value },
            });
        }
    }

    private onSelectedElementsChanged(selectedElements: DomElement[]) {
        if (selectedElements.length === 0) {
            this.selectorToStyle = new Map();
            return;
        }

        // Handle multiple
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
