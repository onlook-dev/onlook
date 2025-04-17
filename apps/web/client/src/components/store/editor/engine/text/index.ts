// import { invokeMainChannel } from '@/lib/utils';
// import { MainChannels } from '@onlook/constants';
// import type { WebviewTag } from 'electron';

import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame';
import type { DomElement, ElementPosition } from '@onlook/models';
import { toast } from '@onlook/ui/use-toast';
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

    async start(el: DomElement, frameView: WebFrameView) {
        const isEditable: boolean | null = await frameView.isChildTextEditable(el.oid);
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

        const res: { originalContent: string } | null = await frameView.startEditingText(el.domId);

        if (!res) {
            console.error('Failed to start editing text, no result returned');
            return;
        }
        const { originalContent } = res;
        this.targetDomEl = el;
        this.originalContent = originalContent;
        this.shouldNotStartEditing = true;
        this.editorEngine.history.startTransaction();

        const adjustedRect = adaptRectToCanvas(this.targetDomEl.rect, frameView);
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
        const frameData = this.editorEngine.frames.get(this.targetDomEl.frameId);
        if (!frameData) {
            console.error('No frameView found for text editing');
            return;
        }
        const domEl: DomElement | null = await frameData.view.editText(this.targetDomEl.domId, newContent);
        if (!domEl) {
            console.error('Failed to edit text. No dom element returned');
            return;
        }
        this.handleEditedText(domEl, newContent, frameView);
    }

    async end() {
        if (!this.targetDomEl) {
            console.error('No target dom element to stop editing');
            return;
        }
        const frameView = this.editorEngine.frames.get(this.targetDomEl.frameId);
        if (!frameView) {
            console.error('No frameView found for end text editing');
            return;
        }
        const res: { newContent: string; domEl: DomElement } | null =
            await frameView.stopEditingText(this.targetDomEl.domId);
        if (!res) {
            console.error('Failed to stop editing text. No result returned');
            return;
        }
        const { newContent, domEl } = res;
        this.handleEditedText(domEl, newContent, frameView);
        this.clean();
    }

    clean() {
        this.targetDomEl = null;
        this.editorEngine.overlay.state.removeTextEditor();
        this.editorEngine.history.commitTransaction();
        this.shouldNotStartEditing = false;
    }

    handleEditedText(domEl: DomElement, newContent: string, frameView: WebFrameView) {
        this.editorEngine.history.push({
            type: 'edit-text',
            targets: [
                {
                    frameId: frameView.id,
                    domId: domEl.domId,
                    oid: domEl.oid,
                },
            ],
            originalContent: this.originalContent ?? '',
            newContent,
        });
        this.editorEngine.overlay.refresh();
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
        const frameId = selectedEl.frameId;
        const frameView = this.editorEngine.frames.get(frameId);
        if (!frameView) {
            return;
        }

        const domEl = await frameView.getElementByDomId(selectedEl.domId, true);
        if (!domEl) {
            return;
        }
        this.start(domEl, frameView);
    }

    async editElementAtLoc(pos: ElementPosition, frameView: WebFrameView) {
        const el: DomElement = await frameView.getElementAtLoc(pos.x, pos.y, true);
        if (!el) {
            console.error('Failed to get element at location');
            return;
        }
        this.start(el, frameView);
    }
}
