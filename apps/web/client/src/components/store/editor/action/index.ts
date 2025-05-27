import { sendAnalytics } from '@/utils/analytics';
import type { DomElement } from '@onlook/models';
import { EditorMode } from '@onlook/models';
import {
    type Action,
    type EditTextAction,
    type GroupElementsAction,
    type InsertElementAction,
    type InsertImageAction,
    type MoveElementAction,
    type RemoveElementAction,
    type RemoveImageAction,
    type UngroupElementsAction,
    type UpdateStyleAction,
} from '@onlook/models/actions';
import { StyleChangeType } from '@onlook/models/style';
import { assertNever } from '@onlook/utility';
import { debounce } from 'lodash';
import type { EditorEngine } from '../engine';

export class ActionManager {
    constructor(private editorEngine: EditorEngine) { }

    async run(action: Action) {
        await this.editorEngine.history.push(action);
        await this.dispatch(action);
    }

    async undo() {
        const action = this.editorEngine.history.undo();

        if (action == null) {
            return;
        }
        await this.dispatch(action);
        await this.editorEngine.code.write(action);
        sendAnalytics('undo');
    }

    async redo() {
        const action = this.editorEngine.history.redo();
        if (action == null) {
            return;
        }
        await this.dispatch(action);
        await this.editorEngine.code.write(action);
        sendAnalytics('redo');
    }

    private async dispatch(action: Action) {
        switch (action.type) {
            case 'update-style':
                await this.updateStyle(action);
                break;
            case 'insert-element':
                await this.insertElement(action);
                break;
            case 'remove-element':
                await this.removeElement(action);
                break;
            case 'move-element':
                await this.moveElement(action);
                break;
            case 'edit-text':
                await this.editText(action);
                break;
            case 'group-elements':
                await this.groupElements(action);
                break;
            case 'ungroup-elements':
                await this.ungroupElements(action);
                break;
            case 'write-code':
                break;
            case 'insert-image':
                this.insertImage(action);
                break;
            case 'remove-image':
                this.removeImage(action);
                break;
            default:
                assertNever(action);
        }
    }

    async updateStyle({ targets }: UpdateStyleAction) {
        const domEls: DomElement[] = [];
        for (const target of targets) {
            const frameData = this.editorEngine.frames.get(target.frameId);
            if (!frameData) {
                console.error('Failed to get frameView');
                return;
            }
            const convertedChange = Object.fromEntries(
                Object.entries(target.change.updated).map(([key, value]) => {
                    const newValue = this.editorEngine.theme.getColorByName(value.value);
                    if (value.type === StyleChangeType.Custom && newValue) {
                        value.value = newValue;
                    }
                    if (value.type === StyleChangeType.Custom && !newValue) {
                        value.value = '';
                    }
                    return [key, value];
                }),
            );

            const change = {
                ...target.change,
                updated: convertedChange,
            };

            const domEl = await frameData.view.updateStyle(target.domId, change);
            if (!domEl) {
                console.error('Failed to update style');
                continue;
            }

            domEls.push(domEl);
        }

        this.refreshDomElement(domEls);
    }

    debouncedRefreshDomElement(domEls: DomElement[]) {
        this.editorEngine.elements.click(domEls);
    }

    refreshDomElement = debounce(this.debouncedRefreshDomElement, 100, { leading: true });

    private async insertElement({ targets, element, editText, location }: InsertElementAction) {
        for (const elementMetadata of targets) {
            const frameView = this.editorEngine.frames.get(elementMetadata.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }

            try {
                const domEl = await frameView.view.insertElement(element, location);
                if (!domEl) {
                    console.error('Failed to insert element');
                    return;
                }

                this.refreshAndClickMutatedElement(domEl);
            } catch (err) {
                console.error('Error inserting element:', err);
            }
        }
    }

    private async removeElement({ targets, location }: RemoveElementAction) {
        for (const target of targets) {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }

            const domEl = await frameView.view.removeElement(location);

            if (!domEl) {
                console.error('Failed to remove element');
                return;
            }

            await this.editorEngine.overlay.refresh();

            this.refreshAndClickMutatedElement(domEl);
        }
    }

    private async moveElement({ targets, location }: MoveElementAction) {
        for (const target of targets) {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            const domEl = await frameView.view.moveElement(target.domId, location.index);
            if (!domEl) {
                console.error('Failed to move element');
                return;
            }
            this.refreshAndClickMutatedElement(domEl);
        }
    }

    private async editText({ targets, newContent }: EditTextAction) {
        for (const target of targets) {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            const domEl = await frameView.view.editText(target.domId, newContent);
            if (!domEl) {
                console.error('Failed to edit text');
                return;
            }

            this.refreshAndClickMutatedElement(domEl);
        }
    }

    private async groupElements({ parent, container, children }: GroupElementsAction) {
        const frameView = this.editorEngine.frames.get(parent.frameId);
        if (!frameView) {
            console.error('Failed to get frameView');
            return;
        }

        const domEl = (await frameView.view.groupElements(
            parent,
            container,
            children,
        )) as DomElement;

        if (!domEl) {
            console.error('Failed to group elements');
            return;
        }

        this.refreshAndClickMutatedElement(domEl);
    }

    private async ungroupElements({ parent, container }: UngroupElementsAction) {
        const frameView = this.editorEngine.frames.get(parent.frameId);
        if (!frameView) {
            console.error('Failed to get frameView');
            return;
        }

        const domEl = (await frameView.view.ungroupElements(parent, container)) as DomElement;

        if (!domEl) {
            console.error('Failed to ungroup elements');
            return;
        }

        this.refreshAndClickMutatedElement(domEl);
    }

    private insertImage({ targets, image }: InsertImageAction) {
        targets.forEach((target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            // sendToWebview(frameView, WebviewChannels.INSERT_IMAGE, {
            //     domId: target.domId,
            //     image,
            // });
        });
    }

    private removeImage({ targets }: RemoveImageAction) {
        targets.forEach((target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            // sendToWebview(frameView, WebviewChannels.REMOVE_IMAGE, {
            //     domId: target.domId,
            // });
        });
    }

    async refreshAndClickMutatedElement(
        domEl: DomElement,
        // newMap: Map<string, LayerNode>,
        // frameData: FrameData,
    ) {
        this.editorEngine.state.editorMode = EditorMode.DESIGN;
        // await this.editorEngine.ast.refreshAstDoc(frameData.view);
        this.editorEngine.elements.click([domEl]);
        // this.editorEngine.ast.updateMap(frameData.view.id, newMap, domEl.domId);
    }

    clear() {
        this.editorEngine.history.clear();
    }
}