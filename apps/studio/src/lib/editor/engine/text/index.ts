import type { DomElement, TextDomElement } from '@onlook/models/element';
import type { WebviewTag } from 'electron';
import jsStringEscape from 'js-string-escape';
import type { EditorEngine } from '..';

export class TextEditingManager {
    targetDomEl: TextDomElement | null = null;
    shouldNotStartEditing = false;

    constructor(private editorEngine: EditorEngine) {}

    get isEditing(): boolean {
        return this.targetDomEl !== null;
    }

    async start(el: DomElement, webview: WebviewTag) {
        const stylesBeforeEdit: Record<string, string> =
            (await webview.executeJavaScript(
                `window.api?.getComputedStyleByDomId('${el.domId}')`,
            )) || {};

        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${el.domId}')`,
        );

        if (!textDomEl) {
            console.error('Failed to edit text: Invalid element');
            return;
        }
        this.targetDomEl = textDomEl;
        this.shouldNotStartEditing = true;
        this.editorEngine.history.startTransaction();

        const adjustedRect = this.editorEngine.overlay.adaptRectFromSourceElement(
            textDomEl.rect,
            webview,
        );
        const isComponent = textDomEl.instanceId !== null;
        this.editorEngine.overlay.clear();

        this.editorEngine.overlay.updateEditTextInput(
            adjustedRect,
            textDomEl.textContent,
            stylesBeforeEdit,
            (content) => this.edit(content),
            () => this.end(),
            isComponent,
        );
    }

    async edit(newContent: string) {
        if (!this.targetDomEl) {
            console.error('No target dom element to edit');
            return;
        }
        const webview = this.editorEngine.webviews.getWebview(this.targetDomEl.webviewId);
        if (!webview) {
            console.error('No webview found for text editing');
            return;
        }
        const textDomEl: TextDomElement | null = await webview.executeJavaScript(
            `window.api?.editText('${this.targetDomEl?.domId}', '${jsStringEscape(newContent)}')`,
        );
        if (!textDomEl) {
            return;
        }

        this.handleEditedText(textDomEl, webview);
    }

    async end() {
        if (!this.targetDomEl) {
            console.error('No target dom element to stop editing');
            return;
        }
        const webview = this.editorEngine.webviews.getWebview(this.targetDomEl.webviewId);
        if (!webview) {
            console.error('No webview found for end text editing');
            return;
        }
        const textDomEl = await webview.executeJavaScript(
            `window.api?.stopEditingText('${this.targetDomEl.domId}')`,
        );
        if (!textDomEl) {
            console.error('Failed to stop editing text. No text dom element returned');
            return;
        }
        this.handleEditedText(textDomEl, webview);
        this.targetDomEl = null;
        this.editorEngine.overlay.removeEditTextInput();
        this.editorEngine.history.commitTransaction();
        this.shouldNotStartEditing = false;
    }

    handleEditedText(textDomEl: TextDomElement, webview: WebviewTag) {
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
                    domId: textDomEl.domId,
                    oid: textDomEl.oid,
                },
            ],
            originalContent: textDomEl.originalContent ?? '',
            newContent: textDomEl.textContent,
        });
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
            `window.api?.getDomElementByDomId('${selectedEl.domId}')`,
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
