import { WebviewTag } from 'electron';
import jsStringEscape from 'js-string-escape';
import { AstManager } from '../ast';
import { HistoryManager } from '../history';
import { OverlayManager } from '../overlay';
import { escapeSelector } from '/common/helpers';
import { DomElement, TextDomElement } from '/common/models/element';

export class TextEditingManager {
    isEditing = false;

    constructor(
        private overlay: OverlayManager,
        private history: HistoryManager,
        private ast: AstManager,
    ) {}

    async start(el: DomElement, webview: WebviewTag) {
        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${escapeSelector(el.selector)}')`,
        );

        if (!textDomEl) {
            console.log('Failed to edit text: Invalid element');
            return;
        }
        this.isEditing = true;
        this.history.startTransaction();

        const adjustedRect = this.overlay.adaptRectFromSourceElement(textDomEl.rect, webview);
        const isComponent = this.ast.getInstance(textDomEl.selector) !== undefined;

        this.overlay.clear();
        this.overlay.updateEditTextInput(
            adjustedRect,
            textDomEl.textContent,
            textDomEl.styles,
            this.createCurriedEdit(textDomEl.textContent, webview),
            this.createCurriedEnd(webview),
            isComponent,
        );
    }

    async edit(originalContent: string, newContent: string, webview: WebviewTag) {
        if (!this.isEditing) {
            return;
        }
        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.editText('${jsStringEscape(newContent)}')`,
        );
        if (!textDomEl) {
            return;
        }

        const adjustedRect = this.overlay.adaptRectFromSourceElement(textDomEl.rect, webview);
        this.overlay.updateTextInputSize(adjustedRect);

        this.history.push({
            type: 'edit-text',
            targets: [{ webviewId: webview.id, selector: textDomEl.selector }],
            originalContent,
            newContent,
        });
    }

    async end(webview: WebviewTag) {
        this.isEditing = false;
        this.overlay.removeEditTextInput();
        await webview.executeJavaScript(`window.api?.stopEditingText()`);
        this.history.commitTransaction();
    }

    private createCurriedEdit(originalContent: string, webview: WebviewTag) {
        return (content: string) => this.edit(originalContent, content, webview);
    }

    private createCurriedEnd(webview: WebviewTag) {
        return () => this.end(webview);
    }
}
