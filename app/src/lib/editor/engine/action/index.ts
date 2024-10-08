import { assertNever, sendAnalytics } from '@/lib/utils';
import { EditorEngine } from '..';
import {
    Action,
    ActionElement,
    ActionElementLocation,
    ActionTarget,
    ActionTargetWithSelector,
    StyleActionTarget,
} from '/common/actions';
import { WebviewChannels } from '/common/constants';

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
        sendAnalytics('undo');
    }

    redo() {
        const action = this.editorEngine.history.redo();
        if (action == null) {
            return;
        }
        this.dispatch(action);
        sendAnalytics('redo');
    }

    private dispatch(action: Action) {
        switch (action.type) {
            case 'update-style':
                this.updateStyle(action.targets, action.style);
                this.editorEngine.code.writeStyle();
                break;
            case 'insert-element':
                this.insertElement(
                    action.targets,
                    action.location,
                    action.element,
                    action.styles,
                    action.editText,
                );
                break;
            case 'remove-element':
                this.removeElement(action.targets, action.location);
                break;
            case 'move-element':
                this.moveElement(action.targets, action.originalIndex, action.newIndex);
                break;
            case 'edit-text':
                this.editText(action.targets, action.newContent);
                break;
            default:
                assertNever(action);
        }
    }

    private updateStyle(targets: Array<StyleActionTarget>, style: string) {
        targets.forEach((target) => {
            const webview = this.editorEngine.webviews.getWebview(target.webviewId);
            if (!webview) {
                return;
            }
            webview.send(WebviewChannels.UPDATE_STYLE, {
                selector: target.selector,
                style,
                value: target.change.updated,
            });
        });
    }

    private insertElement(
        targets: Array<ActionTarget>,
        location: ActionElementLocation,
        element: ActionElement,
        styles: Record<string, string>,
        editText: boolean = false,
    ) {
        targets.forEach((elementMetadata) => {
            const webview = this.editorEngine.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            const payload = JSON.parse(
                JSON.stringify({
                    location,
                    element,
                    styles,
                    editText,
                }),
            );
            webview.send(WebviewChannels.INSERT_ELEMENT, payload);
        });
    }

    private removeElement(targets: Array<ActionTarget>, location: ActionElementLocation) {
        targets.forEach((elementMetadata) => {
            const webview = this.editorEngine.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            const payload = JSON.parse(JSON.stringify({ location }));
            webview.send(WebviewChannels.REMOVE_ELEMENT, payload);
        });
    }

    private moveElement(
        targets: Array<ActionTargetWithSelector>,
        originalIndex: number,
        newIndex: number,
    ) {
        targets.forEach((elementMetadata) => {
            const webview = this.editorEngine.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            webview.send(WebviewChannels.MOVE_ELEMENT, {
                selector: elementMetadata.selector,
                originalIndex,
                newIndex,
            });
        });
    }

    private editText(targets: Array<ActionTargetWithSelector>, content: string) {
        targets.forEach((elementMetadata) => {
            const webview = this.editorEngine.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            webview.send(WebviewChannels.EDIT_ELEMENT_TEXT, {
                selector: elementMetadata.selector,
                content,
            });
        });
    }
}
