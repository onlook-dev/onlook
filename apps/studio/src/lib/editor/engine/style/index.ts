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
    domIdToStyle: Map<string, SelectedStyle> = new Map();
    prevSelected: string = '';
    mode: StyleMode = StyleMode.Root;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            (selectedElements) => this.onSelectedElementsChanged(selectedElements),
        );
    }

    update(style: string, value: string) {
        const styleObj = { [style]: value };
        const action = this.getUpdateStyleAction(styleObj);
        this.editorEngine.action.run(action);
        this.updateStyleNoAction(styleObj);
    }

    updateMultiple(styles: Record<string, string>) {
        this.updateStyleNoAction(styles);
        const action = this.getUpdateStyleAction(styles);
        this.editorEngine.action.run(action);
    }

    getUpdateStyleAction(styles: Record<string, string>, domIds: string[] = []): UpdateStyleAction {
        const selected = this.editorEngine.elements.selected;
        const filteredSelected =
            domIds.length > 0 ? selected.filter((el) => domIds.includes(el.domId)) : selected;

        const targets: Array<StyleActionTarget> = filteredSelected.map((selectedEl) => {
            const change: Change<Record<string, string>> = {
                updated: styles,
                original: Object.fromEntries(
                    Object.keys(styles).map((style) => [
                        style,
                        selectedEl.styles?.defined[style] ??
                            selectedEl.styles?.computed[style] ??
                            '',
                    ]),
                ),
            };
            const target: StyleActionTarget = {
                webviewId: selectedEl.webviewId,
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

    updateStyleNoAction(styles: Record<string, string>) {
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
        let newSelectedStyle = null;
        for (const selectedEl of selectedElements) {
            // Debug log to check what styles are coming from the DOM
            console.log('Selected element:', selectedEl.tagName);
            console.log('Computed styles:', selectedEl.styles?.computed);
            console.log('Defined styles:', selectedEl.styles?.defined);

            // For text styles like color, prioritize the computed styles from the browser
            // which contain the actual rendered values, especially for properties with inheritance
            const computedStyles = selectedEl.styles?.computed || {};
            const definedStyles = selectedEl.styles?.defined || {};

            // Specifically log color values for debugging
            if (computedStyles['color']) {
                console.log('COMPUTED COLOR:', computedStyles['color']);
            }
            if (definedStyles['color']) {
                console.log('DEFINED COLOR:', definedStyles['color']);
            }

            // Create a merged styles object, prioritizing computed styles for critical properties
            const criticalStyleKeys = [
                'color',
                'background-color',
                'font-family',
                'font-size',
                'font-weight',
            ];
            const styles: Record<string, string> = { ...definedStyles };

            // Ensure critical styles come from computed values when available
            for (const key of criticalStyleKeys) {
                if (computedStyles[key]) {
                    styles[key] = computedStyles[key];
                }
            }

            // For non-critical styles, use the defined values if available
            for (const key in computedStyles) {
                if (!styles[key] && computedStyles[key]) {
                    styles[key] = computedStyles[key];
                }
            }

            // Log the final merged styles for debugging
            console.log('Final merged styles - color:', styles['color']);

            const selectedStyle: SelectedStyle = {
                styles,
                parentRect: selectedEl?.parent?.rect ?? ({} as DOMRect),
                rect: selectedEl?.rect ?? ({} as DOMRect),
            };
            newMap.set(selectedEl.domId, selectedStyle);
            if (newSelectedStyle == null) {
                newSelectedStyle = selectedStyle;
            }
        }
        this.domIdToStyle = newMap;
        this.selectedStyle = newSelectedStyle;
    }

    dispose() {
        // Clear state
        this.selectedStyle = null;
        this.domIdToStyle = new Map();
        this.prevSelected = '';
        this.mode = StyleMode.Root;

        // Clear references
        this.editorEngine = null as any;
    }
}
