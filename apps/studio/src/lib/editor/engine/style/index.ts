import type { Change, StyleActionTarget, UpdateStyleAction } from '@onlook/models/actions';
import type { DomElement } from '@onlook/models/element';
import type { CodeDiffRequest } from '@onlook/models/code';
import { makeAutoObservable, reaction } from 'mobx';
import { getTailwindClassChangeFromStyle } from '../code/helpers';
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

    public async applyFlexDirection(domId: string): Promise<void> {
        console.log('[StyleManager] Applying flex direction for domId:', domId);
        const webview = this.editorEngine.webviews.selected[0];
        if (!webview) {
            console.warn('[StyleManager] No webview selected');
            return;
        }

        try {
            console.log('[StyleManager] Detecting arrangement direction...');
            const direction = await webview.executeJavaScript(`
                console.log('[Webview] Getting element for direction detection');
                const el = document.querySelector('[data-onlook-dom-id="${domId}"]');
                console.log('[Webview] Element found:', el);
                console.log('[Webview] Element children count:', el?.children?.length);
                console.log('[Webview] Element current classes:', el?.className);
                const direction = window.api.getDisplayDirection(el);
                console.log('[Webview] Detected direction:', direction);
                return direction === 'horizontal' ? 'flex-row' : 'flex-col';
            `);
            console.log('[StyleManager] Detected direction:', direction);

            const selectedEl = this.editorEngine.elements.selected.find((el) => el.domId === domId);
            if (!selectedEl) {
                console.error('[StyleManager] No selected element found');
                return;
            }
            console.log('[StyleManager] Selected element:', {
                domId: selectedEl.domId,
                styles: selectedEl.styles,
                instanceId: selectedEl.instanceId,
                oid: selectedEl.oid,
            });

            const elementOid =
                this.mode === StyleMode.Instance ? selectedEl.instanceId : selectedEl.oid;
            if (!elementOid) {
                console.error('[StyleManager] Selected element has no valid OID');
                return;
            }
            console.log('[StyleManager] Using elementOid:', elementOid, 'from mode:', this.mode);

            const request: CodeDiffRequest = {
                oid: elementOid,
                attributes: {},
                textContent: null,
                insertedElements: [],
                movedElements: [],
                removedElements: [],
                groupElements: [],
                ungroupElements: [],
                overrideClasses: null,
            };
            console.log('[StyleManager] Created code diff request:', request);

            getTailwindClassChangeFromStyle(request, {
                display: 'flex',
                flexDirection: direction === 'flex-row' ? 'row' : 'column',
            });
            console.log(
                '[StyleManager] Applied Tailwind classes:',
                request.attributes['className'],
            );

            const action: UpdateStyleAction = {
                type: 'update-style',
                targets: [
                    {
                        webviewId: selectedEl.webviewId,
                        domId: selectedEl.domId,
                        oid: elementOid,
                        change: {
                            updated: request.attributes['className'] || '',
                            original: selectedEl.styles['className'] || '',
                        },
                    },
                ],
                style: 'className',
            };
            console.log('[StyleManager] Created style action:', action);

            console.log('[StyleManager] Running action...');
            this.editorEngine.action.run(action);
            console.log('[StyleManager] Writing code diff...');
            await this.editorEngine.code.getAndWriteCodeDiff([request]);
            console.log('[StyleManager] Flex direction application complete');
        } catch (error) {
            console.error('[StyleManager] Failed to apply flex direction:', error);
            throw error;
        }
    }

    update(style: string, value: string) {
        const action = this.getUpdateStyleAction(style, value);
        this.editorEngine.action.run(action);
        this.updateStyleNoAction(style, value);
    }

    getUpdateStyleAction(style: string, value: string, domIds: string[] = []): UpdateStyleAction {
        const selected = this.editorEngine.elements.selected;
        const filteredSelected =
            domIds.length > 0 ? selected.filter((el) => domIds.includes(el.domId)) : selected;
        const targets: Array<StyleActionTarget> = filteredSelected.map((selectedEl) => {
            const change: Change<string> = {
                updated: value,
                original: selectedEl.styles[style],
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
            style: style,
        };
    }

    updateStyleNoAction(style: string, value: string) {
        for (const [selector, selectedStyle] of this.domIdToStyle.entries()) {
            this.domIdToStyle.set(selector, {
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
        this.domIdToStyle = newMap;
        this.selectedStyle = newSelectedStyle;
    }
}
