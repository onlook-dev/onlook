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

            const domEl = await webview.executeJavaScript(
                `window.api?.getElementWithSelector('${escapeSelector(selectedEl.selector)}')`,
            );
            if (!domEl) {
                return;
            }
            console.log(domEl);
        }
        this.copied = newCopied;
    }

    // Paste copied element after selected element
    paste() {
        console.log(this.copied);
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
