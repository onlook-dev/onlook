import { sendAnalytics } from '@/utils/analytics';
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
import { cloneDeep } from 'lodash';
import type { EditorEngine } from '../engine';
import { FrameViewEvents } from '@onlook/constants';

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
                original:target.change.original,
                updated: convertedChange,
            };
            // cloneDeep is used to avoid the issue of observable values can not pass through the webview     
            await frameData.view.listenForFrameViewEvents({ action: FrameViewEvents.UPDATE_STYLE, args: { domId: target.domId, style: cloneDeep(change) } });

        }

    }

    private async insertElement({ targets, element, editText, location }: InsertElementAction) {
        for (const elementMetadata of targets) {
            const frameView = this.editorEngine.frames.get(elementMetadata.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }

            try {
                await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.INSERT_ELEMENT, args: { element, location, editText : editText ?? false } });
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

            await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.REMOVE_ELEMENT, args: { location } })
        }
    }

    private async moveElement({ targets, location }: MoveElementAction) {
        for (const target of targets) {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.MOVE_ELEMENT, args: { domId: target.domId, newIndex: location.index } });
        }
    }

    private async editText({ targets, newContent }: EditTextAction) {
        for (const target of targets) {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }

            await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.EDIT_ELEMENT_TEXT, args: {domId : target.domId, content: newContent}})
        }
    }

    private async groupElements({ parent, container, children }: GroupElementsAction) {
        const frameView = this.editorEngine.frames.get(parent.frameId);
        if (!frameView) {
            console.error('Failed to get frameView');
            return;
        }

        (await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.GROUP_ELEMENTS, args: { parent, container, children } }));

    }

    private async ungroupElements({ parent, container }: UngroupElementsAction) {
        const frameView = this.editorEngine.frames.get(parent.frameId);
        if (!frameView) {
            console.error('Failed to get frameView');
            return;
        }
        (await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.UNGROUP_ELEMENTS, args: { parent, container } }));
    }

    private async insertImage({ targets, image }: InsertImageAction) {
        const promises = targets.map(async (target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.INSERT_IMAGE, args: { domId: target.domId, image } });
        });
        await Promise.all(promises);
    }

    private async removeImage({ targets }: RemoveImageAction) {
        const promises = targets.map(async (target) => {
            const frameView = this.editorEngine.frames.get(target.frameId);
            if (!frameView) {
                console.error('Failed to get frameView');
                return;
            }
            await frameView.view.listenForFrameViewEvents({ action: FrameViewEvents.REMOVE_IMAGE, args: { domId: target.domId } });
        });
        await Promise.all(promises);
    }

    clear() {
        this.editorEngine.history.clear();
    }
}