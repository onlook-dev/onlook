import { sendAnalytics } from '@/lib/utils';
import { EditorEngine } from '..';
import { WebviewChannels } from '/common/constants';
import { assertNever } from '/common/helpers';
import {
    Action,
    EditTextAction,
    GroupElementsAction,
    InsertElementAction,
    MoveElementAction,
    RemoveElementAction,
    UngroupElementsAction,
    UpdateStyleAction,
} from '/common/models/actions';

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
            default:
                assertNever(action);
        }
    }

    updateStyle({ targets, style }: UpdateStyleAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            webview.send(WebviewChannels.UPDATE_STYLE, {
                selector: target.selector,
                style,
                value: target.change.updated,
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
            const payload = JSON.parse(
                JSON.stringify({
                    location,
                    element,
                    editText,
                }),
            );
            webview.send(WebviewChannels.INSERT_ELEMENT, payload);
        });
    }

    private removeElement({ targets, location, codeBlock }: RemoveElementAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            const payload = JSON.parse(JSON.stringify({ location, hasCode: !!codeBlock }));
            webview.send(WebviewChannels.REMOVE_ELEMENT, payload);
        });
    }

    private moveElement({ targets, location }: MoveElementAction) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            webview.send(WebviewChannels.MOVE_ELEMENT, {
                selector: target.selector,
                originalIndex: location.originalIndex,
                newIndex: location.index,
            });
        });
    }

    private editText({ targets, newContent }: EditTextAction) {
        targets.forEach((elementMetadata) => {
            const webview = this.editorEngine.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                console.error('Failed to get webview');
                return;
            }
            webview.send(WebviewChannels.EDIT_ELEMENT_TEXT, {
                selector: elementMetadata.selector,
                content: newContent,
            });
        });
    }

    private groupElements({ targets, location, webviewId, container }: GroupElementsAction) {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }
        const payload = JSON.parse(JSON.stringify({ targets, location, container }));
        webview.send(WebviewChannels.GROUP_ELEMENTS, payload);
    }

    private ungroupElements({ targets, location, webviewId, container }: UngroupElementsAction) {
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }
        const payload = JSON.parse(JSON.stringify({ targets, location, container }));
        webview.send(WebviewChannels.UNGROUP_ELEMENTS, payload);
    }
}
