import type { DomElement } from '@onlook/models';
import type {
    ActionElement,
    ActionLocation,
    ActionTarget,
    InsertElementAction,
} from '@onlook/models/actions';
import { createDomId, createOid } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { getCleanedElement } from '../history/helpers';

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

        if (!frameData.view) {
            console.error('No frame view found');
            return;
        }

        const targetEl: ActionElement | null = (await frameData.view.getActionElement(
            selectedEl.domId,
        ));

        if (!targetEl) {
            console.error('Failed to copy element');
            return;
        }
        if (!selectedEl.oid) {
            console.error('Failed to copy element');
            return;
        }

        const branchData = this.editorEngine.branches.getBranchDataById(selectedEl.branchId);
        if (!branchData) {
            console.error(`Branch data not found for branchId: ${selectedEl.branchId}`);
            return;
        }

        const metadata = await branchData.codeEditor.getJsxElementMetadata(selectedEl.oid);
        this.copied = { element: targetEl, codeBlock: metadata?.code || null };
        await this.clearClipboard();
    }

    async clearClipboard() {
        try {
            await navigator.clipboard.writeText('');
        } catch (error) {
            console.warn('Failed to clear clipboard:', error);
        }
    }

    async paste() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
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
                    branchId: selectedEl.branchId,
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
            element: getCleanedElement(this.copied.element, newDomId, newOid),
            location,
            editText: null,
            pasteParams: {
                oid: newOid,
                domId: newDomId,
            },
            codeBlock: this.copied.codeBlock,
        };

        await this.editorEngine.action.run(action);
    }

    async cut() {
        await this.copy();
        await this.editorEngine.elements.delete();
    }

    async duplicate() {
        const savedCopied = this.copied;
        await this.copy();
        await this.paste();
        this.copied = savedCopied;
    }

    async getInsertLocation(selectedEl: DomElement): Promise<ActionLocation | undefined> {
        const frameId = selectedEl.frameId;
        const frameData = this.editorEngine.frames.get(frameId);
        if (!frameData?.view) {
            console.error('Failed to get frameView');
            return;
        }

        const insertAsSibling =
            selectedEl.tagName === 'img' ||
            selectedEl.domId === this.copied?.element.domId ||
            selectedEl.oid === this.copied?.element.oid;

        if (insertAsSibling) {
            const location: ActionLocation | null = await frameData.view.getActionLocation(
                selectedEl.domId,
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
                targetOid: selectedEl.instanceId ?? selectedEl.oid,
            };
        }
    }

    clear() {
        this.copied = null;
    }
}
