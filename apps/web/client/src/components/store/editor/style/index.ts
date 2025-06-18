import type { DomElement, DomElementStyles, Font } from '@onlook/models';
import {
    type Change,
    type StyleActionTarget,
    type UpdateStyleAction,
} from '@onlook/models/actions';
import { StyleChangeType, type StyleChange } from '@onlook/models/style';
import { makeAutoObservable, reaction } from 'mobx';
import type { CSSProperties } from 'react';
import type { EditorEngine } from '../engine';
import { convertFontString } from '@onlook/utility';

export interface SelectedStyle {
    styles: DomElementStyles;
    parentRect: DOMRect;
    rect: DOMRect;
}

export enum StyleMode {
    Instance = 'instance',
    Root = 'root',
}

export class StyleManager {
    selectedStyle: SelectedStyle | null = null;
    domIdToStyle = new Map<string, SelectedStyle>();
    prevSelected = '';
    mode: StyleMode = StyleMode.Root;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            (selectedElements) => this.onSelectedElementsChanged(selectedElements),
        );
    }

    updateCustom(style: string, value: string, domIds: string[] = []) {
        const styleObj = { [style]: value };
        const action = this.getUpdateStyleAction(styleObj, domIds, StyleChangeType.Custom);
        this.editorEngine.action.run(action);
        this.updateStyleNoAction(styleObj);
    }

    update(style: string, value: string) {
        this.updateMultiple({ [style]: value });
    }

    updateMultiple(styles: Record<string, string>) {
        const action = this.getUpdateStyleAction(styles);
        this.editorEngine.action.run(action);
        this.updateStyleNoAction(styles);
    }

    updateFontFamily(style: string, value: Font) {
        const styleObj = { [style]: value.id };
        
        const action = this.getUpdateStyleAction(styleObj);
        const formattedAction = {
            ...action,
            targets: action.targets.map((val) => ({
                ...val,
                change: {
                    original: Object.fromEntries(
                        Object.entries(val.change.original).map(([key, styleChange]) => [
                            key,
                            {
                                ...styleChange,
                                value: convertFontString(styleChange.value),
                            },
                        ]),
                    ),
                    updated: Object.fromEntries(
                        Object.entries(val.change.updated).map(([key, styleChange]) => [
                            key,
                            {
                                ...styleChange,
                                value: convertFontString(styleChange.value),
                            },
                        ]),
                    ),
                },
            })),
        };
        this.editorEngine.action.run(formattedAction);
    }

    getUpdateStyleAction(
        styles: CSSProperties,
        domIds: string[] = [],
        type: StyleChangeType = StyleChangeType.Value,
    ): UpdateStyleAction {
        if (!this.editorEngine) {
            return {
                type: 'update-style',
                targets: [],
            };
        }
        const selected = this.editorEngine.elements.selected;
        const filteredSelected =
            domIds.length > 0 ? selected.filter((el) => domIds.includes(el.domId)) : selected;

        const targets: Array<StyleActionTarget> = filteredSelected.map((selectedEl) => {
            const change: Change<Record<string, StyleChange>> = {
                updated:
                    Object.fromEntries(
                        Object.keys(styles).map((style) => [
                            style,
                            {
                                value: styles[style as keyof CSSProperties]?.toString() ?? '',
                                type: type === StyleChangeType.Custom ? StyleChangeType.Custom : StyleChangeType.Value,
                            },
                        ]),
                    ),
                original: Object.fromEntries(
                    Object.keys(styles).map((style) => [
                        style,
                        {
                            value:
                                selectedEl.styles?.defined[style] ??
                                selectedEl.styles?.computed[style] ??
                                '',
                            type: StyleChangeType.Value,
                        },
                    ]),
                ),
            };
            const target: StyleActionTarget = {
                frameId: selectedEl.frameId,
                domId: selectedEl.domId,
                oid: this.mode === StyleMode.Instance ? selectedEl.instanceId : selectedEl.oid,
                change: change,
            };
            return target;
        });

        return {
            type: 'update-style',
            targets: targets,
        };
    }

    updateStyleNoAction(styles: CSSProperties) {
        for (const [selector, selectedStyle] of this.domIdToStyle.entries()) {
            this.domIdToStyle.set(selector, {
                ...selectedStyle,
                styles: { ...selectedStyle.styles, ...styles },
            });
        }

        if (this.selectedStyle == null) {
            return;
        }
        this.selectedStyle = {
            ...this.selectedStyle,
            styles: { ...this.selectedStyle.styles, ...styles },
        };
    }

    private onSelectedElementsChanged(selectedElements: DomElement[]) {
        const newSelected = selectedElements
            .map((el) => el.domId)
            .toSorted()
            .join();
        if (newSelected !== this.prevSelected) {
            this.mode = StyleMode.Root;
        }
        this.prevSelected = newSelected;

        if (selectedElements.length === 0) {
            this.domIdToStyle = new Map();
            return;
        }

        const newMap = new Map<string, SelectedStyle>();
        let newSelectedStyle: SelectedStyle | null = null;
        for (const selectedEl of selectedElements) {
            const selectedStyle: SelectedStyle = {
                styles: selectedEl.styles ?? ({ defined: {}, computed: {} } as DomElementStyles),
                parentRect: selectedEl?.parent?.rect ?? ({} as DOMRect),
                rect: selectedEl?.rect ?? ({} as DOMRect),
            };
            newMap.set(selectedEl.domId, selectedStyle);
            newSelectedStyle ??= selectedStyle;
        }
        this.domIdToStyle = newMap;
        this.selectedStyle = newSelectedStyle;
    }

    clear() {
        // Clear state
        this.selectedStyle = null;
        this.domIdToStyle = new Map();
        this.prevSelected = '';
        this.mode = StyleMode.Root;
    }
}
