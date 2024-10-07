import { makeAutoObservable, reaction } from 'mobx';
import { ActionManager } from '../action';
import { ElementManager } from '../element';
import { Change, StyleActionTarget } from '/common/actions';
import { DomElement } from '/common/models/element';

export interface SelectedStyle {
    styles: Record<string, string>;
    parentRect: DOMRect;
    rect: DOMRect;
}

export class StyleManager {
    // Single. TODO: Remove
    selectedStyle: SelectedStyle | null = null;

    // Multiple
    selected: Map<string, SelectedStyle> = new Map();
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

    // TODO: Construct change within this function
    // Get historical style for each based on keys

    updateElementStyle(style: string, value: string) {
        const targets: Array<StyleActionTarget> = this.elements.selected.map((selectedEl) => {
            const change: Change<string> = {
                updated: value,
                original: selectedEl.styles[style],
            };
            const target: StyleActionTarget = {
                webviewId: selectedEl.webviewId,
                selector: selectedEl.selector,
                change: change,
            };
            return target;
        });

        this.action.run({
            type: 'update-style',
            targets: targets,
            style: style,
        });

        this.updateStyleNoAction(style, value);
    }

    updateStyleNoAction(style: string, value: string) {
        for (const [selector, selectedStyle] of this.selected.entries()) {
            this.selected.set(selector, {
                ...selectedStyle,
                styles: { ...selectedStyle.styles, [style]: value },
            });
        }
    }

    private onSelectedElementsChanged(selectedElements: DomElement[]) {
        if (selectedElements.length === 0) {
            this.selected = new Map();
            return;
        }

        // Create a display selected style

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
        this.selected = newSelectedStyles;
    }

    dispose() {
        this.selectedElementsDisposer();
    }
}
