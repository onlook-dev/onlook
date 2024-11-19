import type { Change, StyleActionTarget, UpdateStyleAction } from '@onlook/models/actions';
import type { DomElement } from '@onlook/models/element';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';

export interface SelectedStyle {
    styles: Record<string, string>;
    parentRect: DOMRect;
    rect: DOMRect;
}

export enum StyleMode {
    Instance = 'instance',
    Root = 'root',
}

export class StyleManager {
    selectedStyle: SelectedStyle | null = null;
    selectorToStyle: Map<string, SelectedStyle> = new Map();
    private selectedElementsDisposer: () => void;
    prevSelectedSignature: string = '';
    mode: StyleMode = StyleMode.Root;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        this.selectedElementsDisposer = reaction(
            () => this.editorEngine.elements.selected,
            (selectedElements) => this.onSelectedElementsChanged(selectedElements),
        );
    }

    updateElementStyle(style: string, value: string, selectors?: string[]) {
        const action = this.getUpdateStyleAction(style, value, selectors);
        this.editorEngine.action.run(action);
        this.updateStyleNoAction(style, value);
    }

    getUpdateStyleAction(style: string, value: string, domIds?: string[]): UpdateStyleAction {
        let selected = this.editorEngine.elements.selected;
        if (domIds) {
            selected = selected.filter((el) => domIds.includes(el.domId));
        }

        const targets: Array<StyleActionTarget> = selected.map((selectedEl) => {
            const change: Change<string> = {
                updated: value,
                original: selectedEl.styles[style],
            };
            const target: StyleActionTarget = {
                webviewId: selectedEl.webviewId,
                domId: selectedEl.domId,
                oid: selectedEl.oid,
                change: change,
            };
            return target;
        });
        return {
            type: 'update-style',
            targets: targets,
            style: style,
        };
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
        const newSelected = selectedElements
            .map((el) => el.domId)
            .toSorted()
            .join();
        if (newSelected !== this.prevSelectedSignature) {
            this.mode = StyleMode.Root;
        }
        this.prevSelectedSignature = newSelected;

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
            newMap.set(selectedEl.domId, selectedStyle);
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
