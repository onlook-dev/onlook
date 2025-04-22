import { sendAnalytics } from '@/utils/analytics';
import type { DomElement, LayerNode, StyleActionTarget } from '@onlook/models';
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
import type { EditorEngine } from '..';
import type { FrameData } from '../frames';

export class ActionManager {
    constructor(private editorEngine: EditorEngine) { }

    run(action: Action) {
        this.editorEngine.history.push(action);
        this.dispatch(action);
    }

    undo() {
        const action = this.editorEngine.history.undo();
        if (action == null) {
            return;
        }
        this.dispatch(action);
        // this.editorEngine.code.write(action);
        sendAnalytics('undo');
    }

    redo() {
        const action = this.editorEngine.history.redo();
        if (action == null) {
            return;
        }
        this.dispatch(action);
        // this.editorEngine.code.write(action);
        sendAnalytics('redo');
    }

    private dispatch(action: Action) {
        switch (action.type) {
            case 'update-style':
                void this.updateStyle(action);
                break;
            case 'insert-element':
                this.insertElement(action);
                break;
            case 'remove-element':
                this.removeElement(action);
                break;
            case 'move-element':
                this.moveElement(action);
                break;
            case 'edit-text':
                this.editText(action);
                break;
            case 'group-elements':
                this.groupElements(action);
                break;
            case 'ungroup-elements':
                this.ungroupElements(action);
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

            this.refreshDomElement(domEl, target);
        }
    }

    refreshDomElement(domEl: DomElement, target: StyleActionTarget) {
        const frameData = this.editorEngine.frames.get(domEl.frameId);
        if (!frameData) {
            console.error('Failed to get frameData');
            return;
        }

        this.editorEngine.elements.click([domEl], frameData);
    }

    private insertElement({ targets, element, editText, location }: InsertElementAction) {
        targets.forEach((elementMetadata) => {
            const frameView = this.editorEngine.frames.get(elementMetadata.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            // sendToWebview(frameView, WebviewChannels.INSERT_ELEMENT, {
            //     element,
            //     location,
            //     editText,
            // });
        });
    }

    private removeElement({ targets, location }: RemoveElementAction) {
        targets.forEach((target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            // sendToWebview(frameView, WebviewChannels.REMOVE_ELEMENT, {
            //     location,
            // });
        });
    }

    private moveElement({ targets, location }: MoveElementAction) {
        targets.forEach((target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            // sendToWebview(frameView, WebviewChannels.MOVE_ELEMENT, {
            //     domId: target.domId,
            //     newIndex: location.index,
            // });
        });
    }

    private editText({ targets, newContent }: EditTextAction) {
        targets.forEach((target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            // sendToWebview(frameView, WebviewChannels.EDIT_ELEMENT_TEXT, {
            //     domId: target.domId,
            //     content: newContent,
            // });
        });
    }

    private groupElements({ parent, container, children }: GroupElementsAction) {
        const frameView = this.editorEngine.frames.get(parent.frameId);
        if (!frameView) {
            console.error('Failed to get frameView');
            return;
        }
        // sendToWebview(frameView, WebviewChannels.GROUP_ELEMENTS, { parent, container, children });
    }

    private ungroupElements({ parent, container, children }: UngroupElementsAction) {
        const frameView = this.editorEngine.frames.get(parent.frameId);
        if (!frameView) {
            console.error('Failed to get frameView');
            return;
        }
        // sendToWebview(frameView, WebviewChannels.UNGROUP_ELEMENTS, { parent, container, children });
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
        newMap: Map<string, LayerNode>,
        frameData: FrameData,
    ) {
        this.editorEngine.state.editorMode = EditorMode.DESIGN;
        await this.editorEngine.ast.refreshAstDoc(frameData.view);
        this.editorEngine.elements.click([domEl], frameData);
        this.editorEngine.ast.updateMap(frameData.view.id, newMap, domEl.domId);
    }

    clear() {
        this.editorEngine.history.clear();
    }
}
