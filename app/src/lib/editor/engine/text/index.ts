import { WebviewTag } from 'electron';
import { OverlayManager } from '../overlay';
import { escapeSelector } from '/common/helpers';
import { DomElement, TextDomElement } from '/common/models/element';

export class TextEditingManager {
    isEditing = false;
    constructor(private overlay: OverlayManager) {}

    async start(el: DomElement, webview: WebviewTag) {
        const textEditEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${escapeSelector(el.selector)}')`,
        );

        if (!textEditEl) {
            console.log('Failed to edit text: Invalid element');
            return;
        }
        this.isEditing = true;
        const adjustedRect = this.overlay.adaptRectFromSourceElement(textEditEl.rect, webview);
        this.overlay.updateEditTextInput(adjustedRect, textEditEl.textContent, textEditEl.styles);
    }

    async end(webview: WebviewTag) {
        console.log();
        this.overlay.removeEditTextInput();
        // TODO: When edit finishes, if string is empty, remove the p tag
        const res = await webview.executeJavaScript(`window.api?.stopEditingText()`);
        this.isEditing = false;
    }
}
