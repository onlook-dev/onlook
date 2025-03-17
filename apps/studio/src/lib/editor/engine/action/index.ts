import { sendAnalytics, sendToWebview } from '@/lib/utils';
import {
    StyleChangeType,
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
import { WebviewChannels } from '@onlook/models/constants';
import type { EditorEngine } from '..';
import { assertNever } from '/common/helpers';

export class ActionManager {
    constructor(private editorEngine: EditorEngine) {}

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
        this.editorEngine.code.write(action);
        sendAnalytics('undo');
    }

    redo() {
        const action = this.editorEngine.history.redo();
        if (action == null) {
            return;
        }
        this.dispatch(action);
        this.editorEngine.code.write(action);
        sendAnalytics('redo');
    }

    private dispatch(action: Action) {
        switch (action.type) {
            case 'update-style':
                this.updateStyle(action);
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

    updateStyle({ targets }: UpdateStyleAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
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

            sendToWebview(webview, WebviewChannels.UPDATE_STYLE, {
                domId: target.domId,
                change: {
                    ...target.change,
                    updated: convertedChange,
                },
            });
        });
    }

    private insertElement({ targets, element, editText, location }: InsertElementAction) {
        targets.forEach((elementMetadata) => {
            const webview = this.editorEngine.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            sendToWebview(webview, WebviewChannels.INSERT_ELEMENT, {
                element,
                location,
                editText,
            });
        });
    }

    private removeElement({ targets, location }: RemoveElementAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            sendToWebview(webview, WebviewChannels.REMOVE_ELEMENT, {
                location,
            });
        });
    }

    private moveElement({ targets, location }: MoveElementAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            sendToWebview(webview, WebviewChannels.MOVE_ELEMENT, {
                domId: target.domId,
                newIndex: location.index,
            });
        });
    }

    private editText({ targets, newContent }: EditTextAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            sendToWebview(webview, WebviewChannels.EDIT_ELEMENT_TEXT, {
                domId: target.domId,
                content: newContent,
            });
        });
    }

    private groupElements({ parent, container, children }: GroupElementsAction) {
        const webview = this.editorEngine.webviews.getWebview(parent.webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }
        sendToWebview(webview, WebviewChannels.GROUP_ELEMENTS, { parent, container, children });
    }

    private ungroupElements({ parent, container, children }: UngroupElementsAction) {
        const webview = this.editorEngine.webviews.getWebview(parent.webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }
        sendToWebview(webview, WebviewChannels.UNGROUP_ELEMENTS, { parent, container, children });
    }

    private insertImage({ targets, image }: InsertImageAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            sendToWebview(webview, WebviewChannels.INSERT_IMAGE, {
                domId: target.domId,
                image,
            });
        });
    }

    private removeImage({ targets }: RemoveImageAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            sendToWebview(webview, WebviewChannels.REMOVE_IMAGE, {
                domId: target.domId,
            });
        });
    }

    dispose() {}
}
