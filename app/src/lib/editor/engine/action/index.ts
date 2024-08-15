import { HistoryManager } from '../history';
import { WebviewManager } from '../webview';
import {
    Action,
    ActionTarget,
    ElementLocation,
    ElementObject,
    StyleActionTarget,
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
    }

    redo() {
        const action = this.history.redo();
        if (action == null) {
            return;
        }

        this.dispatch(action);
    }

    private dispatch(action: Action) {
        switch (action.type) {
            case 'update-style':
                this.updateStyle(action.targets, action.style, action.change.updated);
                break;
            case 'insert-element':
                this.insertElement(action.targets, action.location, action.element, action.styles);
                break;
        }
    }

    private updateStyle(targets: Array<StyleActionTarget>, style: string, value: string) {
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
        location: ElementLocation,
        element: ElementObject,
        styles: Record<string, string>,
    ) {
        targets.forEach((elementMetadata) => {
            const webview = this.webviews.getWebview(elementMetadata.webviewId);
            if (!webview) {
                return;
            }
            webview.send(WebviewChannels.INSERT_ELEMENT, {
                location,
                element,
                styles,
            });
        });
    }
}
