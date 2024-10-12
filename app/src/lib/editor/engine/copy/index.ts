import { makeAutoObservable } from 'mobx';
import { EditorEngine } from '..';
import { MainChannels } from '/common/constants';
import { escapeSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import {
    ActionElement,
    ActionElementLocation,
    ActionTarget,
    InsertElementAction,
} from '/common/models/actions';
import { WebViewElement } from '/common/models/element';

export class CopyManager {
    copied: {
        element: ActionElement;
        codeBlock: string | undefined;
    } | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async copy() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return;
        }
        // TODO: Handle multiple copies
        const selectedEl = this.editorEngine.elements.selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }

        const clonedEl: ActionElement | null = await webview.executeJavaScript(
            `window.api?.copyElementBySelector('${escapeSelector(selectedEl.selector)}')`,
        );
        if (!clonedEl) {
            console.error('Failed to copy element');
            return;
        }
        let codeBlock: string | undefined;
        const templateNode = this.editorEngine.ast.getAnyTemplateNode(selectedEl.selector);
        if (templateNode) {
            codeBlock = await window.api?.invoke(MainChannels.GET_CODE_BLOCK, templateNode);
        }
        this.copied = { element: clonedEl, codeBlock };
    }

    async paste() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return;
        }
        if (!this.copied) {
            console.log('Nothing to paste');
            return;
        }

        const selectedEl = this.editorEngine.elements.selected[0];

        const targets: Array<ActionTarget> = this.editorEngine.elements.selected.map(
            (selectedEl) => {
                const target: ActionTarget = {
                    webviewId: selectedEl.webviewId,
                    selector: selectedEl.selector,
                    uuid: selectedEl.uuid,
                };
                return target;
            },
        );

        const location = await this.getInsertLocation(selectedEl);
        if (!location) {
            console.error('Failed to get insert location');
            return;
        }

        const action: InsertElementAction = {
            type: 'insert-element',
            targets: targets,
            element: this.copied.element,
            location,
            codeBlock: this.copied.codeBlock,
        };

        this.editorEngine.action.run(action);
    }

    async cut() {
        await this.copy();
        this.editorEngine.elements.delete();
    }

    async duplicate() {
        const savedCopied = this.copied;
        await this.copy();
        await this.paste();
        this.copied = savedCopied;
    }

    clear() {
        this.copied = null;
    }

    async getInsertLocation(
        selectedEl: WebViewElement,
    ): Promise<ActionElementLocation | undefined> {
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }

        const insertAsSibling =
            selectedEl.tagName === 'img' || selectedEl.selector === this.copied?.element.selector;

        let location: ActionElementLocation;
        if (insertAsSibling) {
            location = await webview.executeJavaScript(
                `window.api?.getActionElementLocation('${escapeSelector(selectedEl.selector)}')`,
            );
            location.index = location.index + 1;
        } else {
            location = {
                position: InsertPos.APPEND,
                targetSelector: selectedEl.selector,
                index: -1,
            };
        }

        return location;
    }
}
