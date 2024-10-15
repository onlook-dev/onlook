import { EditorEngine } from '..';
import { escapeSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import {
    ActionElementLocation,
    GroupActionTarget,
    GroupElementsAction,
} from '/common/models/actions';
import { WebViewElement } from '/common/models/element';

export class GroupManager {
    constructor(private editorEngine: EditorEngine) {}

    canGroupElements(elements: WebViewElement[]) {
        if (elements.length === 0) {
            return false;
        }
        if (elements.length === 1) {
            return true;
        }

        const sameWebview = elements.every((el) => el.webviewId === elements[0].webviewId);

        if (!sameWebview) {
            return false;
        }

        const parentSelector = elements[0].parent?.selector;
        if (!parentSelector) {
            return false;
        }

        const sameParent = elements.every((el) => el.parent?.selector === parentSelector);
        if (!sameParent) {
            return false;
        }

        return true;
    }

    async groupSelectedElements() {
        const selectedEls = this.editorEngine.elements.selected;
        if (!this.canGroupElements(selectedEls)) {
            console.error('Cannot group elements');
            return;
        }

        const targets: GroupActionTarget[] = [];

        for (const el of selectedEls) {
            const location = await this.getElementLocation(el);
            if (!location) {
                console.error('Failed to get element location');
                return;
            }
            targets.push({
                ...el,
                index: location.index,
            });
        }

        if (targets.length === 0) {
            console.error('No group targets found');
            return;
        }

        const groupAction: GroupElementsAction = {
            type: 'group-element',
            targets: targets,
            location: {
                position: InsertPos.INDEX,
                targetSelector: selectedEls[0].parent!.selector,
                index: Math.min(...targets.map((t) => t.index)),
            },
            webviewId: selectedEls[0].webviewId,
        };
        this.editorEngine.action.run(groupAction);
    }

    async getElementLocation(el: WebViewElement): Promise<ActionElementLocation | null> {
        const webview = this.editorEngine.webviews.getWebview(el.webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return null;
        }
        const location: ActionElementLocation | null = await webview.executeJavaScript(
            `window.api?.getActionElementLocation('${escapeSelector(el.selector)}')`,
        );
        if (!location) {
            console.error('Failed to get element location');
            return null;
        }
        return location;
    }
}
