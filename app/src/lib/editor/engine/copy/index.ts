import { makeAutoObservable } from 'mobx';
import { EditorEngine } from '..';
import { escapeSelector } from '/common/helpers';
import { InsertPos } from '/common/models';
import {
    ActionElement,
    ActionTargetWithSelector,
    InsertElementAction,
} from '/common/models/actions';

export class CopyManager {
    copied: ActionElement | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async copy() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return;
        }
        // TODO: Handle multiple
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
        this.copied = clonedEl;
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

        const targets: Array<ActionTargetWithSelector> = this.editorEngine.elements.selected.map(
            (selectedEl) => {
                const target: ActionTargetWithSelector = {
                    webviewId: selectedEl.webviewId,
                    selector: selectedEl.selector,
                };
                return target;
            },
        );

        const action: InsertElementAction = {
            type: 'insert-element',
            targets: targets,
            element: this.copied,
            location: {
                position: InsertPos.AFTER,
                targetSelector: selectedEl.selector,
                index: -1,
            },
        };

        this.editorEngine.action.run(action);
    }

    // Copy and delete element
    cut() {
        console.log('Cut');
    }

    // async getCodeBlock(dataOnlookId: string): Promise<string | null> {
    //     const templateNode: TemplateNode | undefined = this.ast.getInstance(dataOnlookId) || this.ast.getRoot(dataOnlookId);
    //     if (!templateNode) {
    //         console.error('Failed to get template node');
    //         return null;
    //     }
    //     const codeBlock: string | null = await window.api?.invoke(MainChannels.GET_CODE_BLOCK, dataOnlookId);
    //     if (!codeBlock) {
    //         console.error('Failed to get code block');
    //         return null;
    //     }
    //     return codeBlock;
    // }

    async duplicate() {
        const savedCopied = this.copied;
        await this.copy();
        await this.paste();
        this.copied = savedCopied;
    }

    clear() {
        this.copied = null;
    }
}
