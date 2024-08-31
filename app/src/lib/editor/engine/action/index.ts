import { sendAnalytics } from '@/lib/utils';
import { HistoryManager } from '../history';
import { WebviewManager } from '../webview';
import {
    Action,
    ActionElement,
    ActionElementLocation,
    ActionTarget,
    ActionTargetWithSelector,
} from '/common/actions';
import { WebviewChannels } from '/common/constants';

export class ActionManager {
    constructor(
        private history: HistoryManager,
        private webviews: WebviewManager,
    ) {}

    run(action: Action) {
        this.history.push(action);
        this.dispatch(action);
    }

    undo() {
        const action = this.history.undo();
        if (action == null) {
            return;
        }

        this.dispatch(action);
        sendAnalytics('undo');
    }

    redo() {
        const action = this.history.redo();
        if (action == null) {
            return;
        }

        this.dispatch(action);
        sendAnalytics('redo');
    }

    private dispatch(action: Action) {
        switch (action.type) {
            case 'update-style':
                this.updateStyle(action.targets, action.style, action.change.updated);
                break;
            case 'insert-element':
                this.insertElement(action.targets, action.location, action.element, action.styles);
                break;
            case 'remove-element':
                this.removeElement(action.targets, action.location);
                break;
            case 'move-element':
                this.moveElement(action.targets, action.originalIndex, action.newIndex);
        }
    }

    private updateStyle(targets: Array<ActionTargetWithSelector>, style: string, value: string) {
        targets.forEach((elementMetadata) => {
            const webview = this.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            webview.send(WebviewChannels.UPDATE_STYLE, {
                selector: elementMetadata.selector,
                style,
                value,
            });
        });
    }

    private insertElement(
        targets: Array<ActionTarget>,
        location: ActionElementLocation,
        element: ActionElement,
        styles: Record<string, string>,
    ) {
        targets.forEach((elementMetadata) => {
            const webview = this.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            const payload = JSON.parse(
                JSON.stringify({
                    location,
                    element,
                    styles,
                }),
            );
            webview.send(WebviewChannels.INSERT_ELEMENT, payload);
        });
    }

    private removeElement(targets: Array<ActionTarget>, location: ActionElementLocation) {
        targets.forEach((elementMetadata) => {
            const webview = this.webviews.getWebview(elementMetadata.webviewId);
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
            const webview = this.webviews.getWebview(elementMetadata.webviewId);
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
}
