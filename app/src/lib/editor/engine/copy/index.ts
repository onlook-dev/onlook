import { makeAutoObservable } from 'mobx';
import { ElementManager } from '../element';
import { WebviewManager } from '../webview';
import { escapeSelector } from '/common/helpers';

export class CopyManager {
    copied: any[] = [];

    constructor(
        private elements: ElementManager,
        private webviews: WebviewManager,
    ) {
        makeAutoObservable(this);
    }

    // Get selected element
    // Save copied
    async copy() {
        const selected = this.elements.selected;
        if (selected.length === 0) {
            return;
        }
        const newCopied: any[] = [];
        for (const selectedEl of selected) {
            const webviewId = selectedEl.webviewId;
            const webview = this.webviews.getWebview(webviewId);
            if (!webview) {
                return;
            }

            const clonedEl = await webview.executeJavaScript(
                `window.api?.copyElementBySelector('${escapeSelector(selectedEl.selector)}')`,
            );
            if (!clonedEl) {
                console.log('Failed to copy element');
                return;
            }
            newCopied.push(clonedEl);
        }
        this.copied = newCopied;
    }

    // Paste copied element after selected element
    async paste() {
        const selected = this.elements.selected;
        if (selected.length === 0) {
            return;
        }
        for (const selectedEl of selected) {
            const webviewId = selectedEl.webviewId;
            const webview = this.webviews.getWebview(webviewId);
            if (!webview) {
                return;
            }

            for (const copiedEl of this.copied) {
                console.log(copiedEl);
                const res = await webview.executeJavaScript(
                    `window.api?.pastElementAfterSelector('${escapeSelector(selectedEl.selector)}', '${copiedEl.html}')`,
                );
                console.log(res);
            }
        }
    }

    // Copy and delete element
    cut() {
        console.log('Cut');
    }

    // Copy and paste element
    duplicate() {
        console.log('Duplicate');
    }

    clear() {
        this.copied = [];
    }
}
