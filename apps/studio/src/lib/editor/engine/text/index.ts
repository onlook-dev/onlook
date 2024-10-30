import type { WebviewTag } from 'electron';
import jsStringEscape from 'js-string-escape';
import type { EditorEngine } from '..';
import { escapeSelector } from '/common/helpers';
import type { DomElement, TextDomElement } from '/common/models/element';

export class TextEditingManager {
    isEditing = false;
    shouldNotStartEditing = false;

    constructor(private editorEngine: EditorEngine) {}

    async start(el: DomElement, webview: WebviewTag) {
        const stylesBeforeEdit: Record<string, string> =
            (await webview.executeJavaScript(
                `window.api?.getComputedStyleBySelector('${escapeSelector(el.selector)}')`,
            )) || {};

        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${escapeSelector(el.selector)}')`,
        );

        if (!textDomEl) {
            console.log('Failed to edit text: Invalid element');
            return;
        }
        this.isEditing = true;
        this.shouldNotStartEditing = true;
        this.editorEngine.history.startTransaction();

        const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            textDomEl.rect,
            webview,
        );
        const isComponent = this.editorEngine.ast.getInstance(textDomEl.selector) !== undefined;

        this.editorEngine.overlay.clear();

        this.editorEngine.overlay.updateEditTextInput(
            adjustedRect,
            textDomEl.textContent,
            stylesBeforeEdit,
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

        const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            textDomEl.rect,
            webview,
        );
        this.editorEngine.overlay.updateTextInputSize(adjustedRect);

        this.editorEngine.history.push({
            type: 'edit-text',
            targets: [
                {
                    webviewId: webview.id,
                    selector: textDomEl.selector,
                    uuid: textDomEl.uuid,
                },
            ],
            originalContent,
            newContent,
        });
    }

    async end(webview: WebviewTag) {
        this.isEditing = false;
        this.editorEngine.overlay.removeEditTextInput();
        await webview.executeJavaScript(`window.api?.stopEditingText()`);
        this.editorEngine.history.commitTransaction();
        this.shouldNotStartEditing = false;
    }

    private createCurriedEdit(originalContent: string, webview: WebviewTag) {
        return (content: string) => this.edit(originalContent, content, webview);
    }

    private createCurriedEnd(webview: WebviewTag) {
        return () => this.end(webview);
    }

    async editSelectedElement() {
        if (this.shouldNotStartEditing) {
            return;
        }

        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return;
        }
        const selectedEl = selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            return;
        }

        const domEl = await webview.executeJavaScript(
            `window.api?.getElementWithSelector('${escapeSelector(selectedEl.selector)}')`,
        );
        if (!domEl) {
            return;
        }
        this.start(domEl, webview);
    }

    async editElementAtLoc(pos: { x: number; y: number }, webview: WebviewTag) {
        const el: DomElement = await webview.executeJavaScript(
            `window.api?.getElementAtLoc(${pos.x}, ${pos.y}, true)`,
        );
        if (!el) {
            console.error('Failed to get element at location');
            return;
        }
        this.start(el, webview);
    }
}
