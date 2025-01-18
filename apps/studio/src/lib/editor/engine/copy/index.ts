import { createDomId, createOid } from '@/lib/utils';
import type {
    ActionElement,
    ActionLocation,
    ActionTarget,
    InsertElementAction,
} from '@onlook/models/actions';
import { EditorAttributes } from '@onlook/models/constants';
import type { DomElement } from '@onlook/models/element';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class CopyManager {
    copied: {
        element: ActionElement;
        codeBlock: string | null;
    } | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async copy() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return;
        }
        const selectedEl = this.editorEngine.elements.selected[0];
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }

        const targetEl: ActionElement | null = await webview.executeJavaScript(
            `window.api?.getActionElementByDomId('${selectedEl.domId}')`,
        );
        if (!targetEl) {
            console.error('Failed to copy element');
            return;
        }
        const codeBlock = await this.editorEngine.code.getCodeBlock(selectedEl.oid);
        this.copied = { element: targetEl, codeBlock };
    }

    async paste() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return;
        }

        if (await this.pasteImageFromClipboard()) {
            return;
        }

        if (!this.copied) {
            console.warn('Nothing to paste');
            return;
        }

        const selectedEl = this.editorEngine.elements.selected[0];

        const targets: Array<ActionTarget> = this.editorEngine.elements.selected.map(
            (selectedEl) => {
                const target: ActionTarget = {
                    webviewId: selectedEl.webviewId,
                    domId: selectedEl.domId,
                    oid: selectedEl.oid,
                };
                return target;
            },
        );

        const location = await this.getInsertLocation(selectedEl);
        if (!location) {
            console.error('Failed to get insert location');
            return;
        }

        const newOid = createOid();
        const newDomId = createDomId();

        const action: InsertElementAction = {
            type: 'insert-element',
            targets: targets,
            element: this.getCleanedCopyEl(this.copied.element, newDomId, newOid),
            location,
            editText: null,
            pasteParams: {
                codeBlock: this.copied.codeBlock,
                oid: newOid,
                domId: newDomId,
            },
        };

        this.editorEngine.action.run(action);
    }

    async pasteImageFromClipboard(): Promise<boolean> {
        try {
            const clipboard = await navigator.clipboard.read();
            for (const item of clipboard) {
                const imageType = item.types.find((type) => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        this.editorEngine.image.insert(base64data, imageType);
                    };
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to read clipboard:', error);
        }
        return false;
    }

    getCleanedCopyEl(copiedEl: ActionElement, domId: string, oid: string): ActionElement {
        const filteredAttr: Record<string, string> = {
            class: copiedEl.attributes['class'] || '',
            [EditorAttributes.DATA_ONLOOK_DOM_ID]: domId,
            [EditorAttributes.DATA_ONLOOK_ID]: oid,
            [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
        };

        return {
            ...copiedEl,
            attributes: filteredAttr,
        };
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

    async getInsertLocation(selectedEl: DomElement): Promise<ActionLocation | undefined> {
        const webviewId = selectedEl.webviewId;
        const webview = this.editorEngine.webviews.getWebview(webviewId);
        if (!webview) {
            console.error('Failed to get webview');
            return;
        }

        const insertAsSibling =
            selectedEl.tagName === 'img' ||
            selectedEl.domId === this.copied?.element.domId ||
            selectedEl.oid === this.copied?.element.oid;

        if (insertAsSibling) {
            const location: ActionLocation | null = await webview.executeJavaScript(
                `window.api?.getActionLocation('${selectedEl.domId}')`,
            );
            if (!location) {
                console.error('Failed to get location');
                return;
            }
            // Insert as sibling after the selected element
            if (location.type === 'index') {
                location.index += 1;
            }
            return location;
        } else {
            return {
                type: 'append',
                targetDomId: selectedEl.domId,
                targetOid: selectedEl.instanceId || selectedEl.oid,
            };
        }
    }

    dispose() {
        // Clear state
        this.clear();

        // Clear references
        this.editorEngine = null as any;
    }
}
