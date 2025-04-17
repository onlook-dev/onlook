import { EditorAttributes } from '@onlook/constants';
import type { DomElement } from '@onlook/models';
import type {
    ActionElement,
    ActionLocation,
    ActionTarget,
    InsertElementAction,
} from '@onlook/models/actions';
import { createDomId, createOid } from '@onlook/utility';
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
        if (!selectedEl) {
            console.error('Failed to copy element');
            return;
        }
        const frameId = selectedEl.frameId;
        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData) {
            console.error('Failed to get frameView');
            return;
        }

        const targetEl: ActionElement | null = await frameData.view.getActionElement(selectedEl.domId);
        if (!targetEl) {
            console.error('Failed to copy element');
            return;
        }
        const codeBlock = await this.editorEngine.code.getCodeBlock(selectedEl.oid);
        this.copied = { element: targetEl, codeBlock };
        this.clearClipboard();
    }

    clearClipboard() {
        try {
            navigator.clipboard.writeText('');
        } catch (error) {
            console.warn('Failed to clear clipboard:', error);
        }
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

        if (!selectedEl) {
            console.error('Failed to paste element');
            return;
        }

        const targets: Array<ActionTarget> = this.editorEngine.elements.selected.map(
            (selectedEl) => {
                const target: ActionTarget = {
                    frameId: selectedEl.frameId,
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
                oid: newOid,
                domId: newDomId,
            },
            codeBlock: this.copied.codeBlock,
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

        // Process children recursively
        const processedChildren = copiedEl.children?.map((child) => {
            const newChildDomId = createDomId();
            const newChildOid = createOid();
            return this.getCleanedCopyEl(child, newChildDomId, newChildOid);
        });

        return {
            ...copiedEl,
            attributes: filteredAttr,
            children: processedChildren || [],
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
        const frameId = selectedEl.frameId;
        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData) {
            console.error('Failed to get frameView');
            return;
        }

        const insertAsSibling =
            selectedEl.tagName === 'img' ||
            selectedEl.domId === this.copied?.element.domId ||
            selectedEl.oid === this.copied?.element.oid;

        if (insertAsSibling) {
            const location: ActionLocation | null = await frameData.view.getActionLocation(selectedEl.domId);
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
