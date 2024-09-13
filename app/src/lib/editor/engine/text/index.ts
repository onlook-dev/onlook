import { WebviewTag } from 'electron';
import jsStringEscape from 'js-string-escape';
import { OverlayManager } from '../overlay';
import { escapeSelector } from '/common/helpers';
import { DomElement, TextDomElement } from '/common/models/element';

export class TextEditingManager {
    isEditing = false;
    constructor(private overlay: OverlayManager) {}

    async start(el: DomElement, webview: WebviewTag) {
        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${escapeSelector(el.selector)}')`,
        );

        if (!textDomEl) {
            console.log('Failed to edit text: Invalid element');
            return;
        }
        this.isEditing = true;
        const curriedEdit = (content: string) => this.edit(content, webview);
        const adjustedRect = this.overlay.adaptRectFromSourceElement(textDomEl.rect, webview);

        this.overlay.clear();
        this.overlay.updateEditTextInput(
            adjustedRect,
            textDomEl.textContent,
            textDomEl.styles,
            curriedEdit,
        );
    }

    async edit(content: string, webview: WebviewTag) {
        if (!this.isEditing) {
            return;
        }
        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.editText("${jsStringEscape(content)}")`,
        );
        if (!textDomEl) {
            return;
        }

        const adjustedRect = this.overlay.adaptRectFromSourceElement(textDomEl.rect, webview);
        this.overlay.updateTextInputSize(adjustedRect);
    }

    async end(webview: WebviewTag) {
        this.isEditing = false;
        this.overlay.removeEditTextInput();
        const res = await webview.executeJavaScript(`window.api?.stopEditingText()`);
    }
}
