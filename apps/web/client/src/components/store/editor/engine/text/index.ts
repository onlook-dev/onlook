import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import type { DomElement, ElementPosition } from '@onlook/models/element';
import { toast } from '@onlook/ui/use-toast';
import type { WebviewTag } from 'electron';
import jsStringEscape from 'js-string-escape';
import type { EditorEngine } from '..';
import { adaptRectToCanvas } from '../overlay/utils';

export class TextEditingManager {
    targetDomEl: DomElement | null = null;
    originalContent: string | null = null;
    shouldNotStartEditing = false;

    constructor(private editorEngine: EditorEngine) { }

    get isEditing(): boolean {
        return this.targetDomEl !== null;
    }

    async start(el: DomElement, webview: WebviewTag) {
        const isEditable: boolean | null = await invokeMainChannel(
            MainChannels.IS_CHILD_TEXT_EDITABLE,
            { oid: el.oid },
        );
        if (isEditable !== true) {
            toast({
                title:
                    isEditable === null
                        ? "Can't determine if text is editable"
                        : "Can't edit text because it's not plain text. Edit in code or use AI.",
                variant: 'destructive',
            });
            return;
        }

        const res: { originalContent: string } | null = await webview.executeJavaScript(
            `window.api?.startEditingText('${el.domId}')`,
        );

        if (!res) {
            console.error('Failed to start editing text, no result returned');
            return;
        }
        const { originalContent } = res;
        this.targetDomEl = el;
        this.originalContent = originalContent;
        this.shouldNotStartEditing = true;
        this.editorEngine.history.startTransaction();

        const adjustedRect = adaptRectToCanvas(this.targetDomEl.rect, webview);
        const isComponent = this.targetDomEl.instanceId !== null;
        this.editorEngine.overlay.clear();

        this.editorEngine.overlay.state.addTextEditor(
            adjustedRect,
            this.originalContent,
            el.styles?.computed ?? {},
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
        const webview = this.editorEngine.webviews.getWebview(this.targetDomEl.frameId);
        if (!webview) {
            console.error('No webview found for text editing');
            return;
        }
        const domEl: DomElement | null = await webview.executeJavaScript(
            `window.api?.editText('${this.targetDomEl.domId}', '${jsStringEscape(newContent)}')`,
        );
        if (!domEl) {
            console.error('Failed to edit text. No dom element returned');
            return;
        }
        this.handleEditedText(domEl, newContent, webview);
    }

    async end() {
        if (!this.targetDomEl) {
            console.error('No target dom element to stop editing');
            return;
        }
        const webview = this.editorEngine.webviews.getWebview(this.targetDomEl.frameId);
        if (!webview) {
            console.error('No webview found for end text editing');
            return;
        }
        const res: { newContent: string; domEl: DomElement } | null =
            await webview.executeJavaScript(
                `window.api?.stopEditingText('${this.targetDomEl.domId}')`,
            );
        if (!res) {
            console.error('Failed to stop editing text. No result returned');
            return;
        }
        const { newContent, domEl } = res;
        this.handleEditedText(domEl, newContent, webview);
        this.clean();
    }

    clean() {
        this.targetDomEl = null;
        this.editorEngine.overlay.state.removeTextEditor();
        this.editorEngine.history.commitTransaction();
        this.shouldNotStartEditing = false;
    }

    handleEditedText(domEl: DomElement, newContent: string, webview: WebviewTag) {
        this.editorEngine.history.push({
            type: 'edit-text',
            targets: [
                {
                    frameId: webview.id,
                    domId: domEl.domId,
                    oid: domEl.oid,
                },
            ],
            originalContent: this.originalContent ?? '',
            newContent,
        });
        this.editorEngine.overlay.refreshOverlay();
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
        const webviewId = selectedEl.frameId;
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

    async editElementAtLoc(pos: ElementPosition, webview: WebviewTag) {
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
