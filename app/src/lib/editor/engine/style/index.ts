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
    selectedStyle: SelectedStyle | null = null;
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
        for (const [selector, selectedStyle] of this.selectorToStyle.entries()) {
            this.selectorToStyle.set(selector, {
                ...selectedStyle,
                styles: { ...selectedStyle.styles, [style]: value },
            });
        }

        if (this.selectedStyle == null) {
            return;
        }
        this.selectedStyle = {
            ...this.selectedStyle,
            styles: { ...this.selectedStyle.styles, [style]: value },
        };
    }

    private onSelectedElementsChanged(selectedElements: DomElement[]) {
        if (selectedElements.length === 0) {
            this.selectorToStyle = new Map();
            return;
        }

        const newMap = new Map<string, SelectedStyle>();
        let newSelectedStyle = null;
        for (const selectedEl of selectedElements) {
            const selectedStyle: SelectedStyle = {
                styles: selectedEl.styles,
                parentRect: selectedEl?.parent?.rect ?? ({} as DOMRect),
                rect: selectedEl?.rect ?? ({} as DOMRect),
            };
            newMap.set(selectedEl.selector, selectedStyle);
            if (newSelectedStyle == null) {
                newSelectedStyle = selectedStyle;
            }
        }
        this.selectorToStyle = newMap;
        this.selectedStyle = newSelectedStyle;
    }

    dispose() {
        this.selectedElementsDisposer();
    }
}
