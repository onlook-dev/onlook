import type { WebFrameView } from '@/app/project/[id]/_components/canvas/frame/web-frame';
import type { DomElement, EditTextResult, ElementPosition } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { adaptRectToCanvas } from '../overlay/utils';

export class TextEditingManager {
    private targetDomEl: DomElement | null = null;
    private originalContent: string | null = null;
    private shouldNotStartEditing = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get isEditing(): boolean {
        return this.targetDomEl !== null;
    }

    async start(el: DomElement, frameView: WebFrameView): Promise<void> {
        try {
            const isEditable = (await frameView.isChildTextEditable(el.oid ?? '')) as
                | boolean
                | null;
            if (isEditable !== true) {
                throw new Error(
                    isEditable === null
                        ? "Can't determine if text is editable"
                        : "Can't edit text because it's not plain text. Edit in code or use AI.",
                );
            }

            const res = (await frameView.startEditingText(el.domId)) as EditTextResult | null;
            if (!res) {
                throw new Error('Failed to start editing text, no result returned');
            }

            const computedStyles = (await frameView.getComputedStyleByDomId(el.domId)) as Record<
                string,
                string
            > | null;
            if (!computedStyles) {
                throw new Error('Failed to get computed styles for text editing');
            }

            const { originalContent } = res;
            this.targetDomEl = el;
            this.originalContent = originalContent;
            this.shouldNotStartEditing = true;
            this.editorEngine.history.startTransaction();

            const adjustedRect = adaptRectToCanvas(el.rect, frameView);
            const isComponent = el.instanceId !== null;
            this.editorEngine.overlay.clear();

            this.editorEngine.overlay.state.addTextEditor(
                adjustedRect,
                this.originalContent,
                el.styles?.computed ?? {},
                (content: string) => {
                    this.edit(content);
                },
                () => {
                    this.end();
                },
                isComponent,
            );
        } catch (error) {
            console.error('Error starting text edit:', error);
        }
    }

    async edit(newContent: string): Promise<void> {
        try {
            if (!this.targetDomEl) {
                throw new Error('No target dom element to edit');
            }
            const frameData = this.editorEngine.frames.get(this.targetDomEl.frameId);
            if (!frameData?.view) {
                throw new Error('No frameView found for text editing');
            }

            const domEl = (await frameData.view.editText(
                this.targetDomEl.domId,
                newContent,
            )) as DomElement | null;
            if (!domEl) {
                throw new Error('Failed to edit text. No dom element returned');
            }

            await this.handleEditedText(domEl, newContent, frameData.view);
        } catch (error) {
            console.error('Error editing text:', error);
        }
    }

    async end(): Promise<void> {

        try {
            if (!this.targetDomEl) {
                throw new Error('No target dom element to stop editing');
            }

            const frameData = this.editorEngine.frames.get(this.targetDomEl.frameId);
            if (!frameData?.view) {
                throw new Error('No frameView found for end text editing');
            }

            const res = await frameData.view.stopEditingText(this.targetDomEl.domId);
            if (!res) {
                throw new Error('Failed to stop editing text. No result returned');
            }

            const { newContent, domEl } = res as {
                newContent: string;
                domEl: DomElement;
            };
            await this.handleEditedText(domEl, newContent, frameData.view);
            await this.clean();
        } catch (error) {
            console.error('Error ending text edit:', error);
        }
    }

    async clean(): Promise<void> {
        this.targetDomEl = null;
        this.editorEngine.overlay.state.removeTextEditor();
        await this.editorEngine.history.commitTransaction();
        this.shouldNotStartEditing = false;
    }

    private async handleEditedText(
        domEl: DomElement,
        newContent: string,
        frameView: WebFrameView,
    ): Promise<void> {
        try {
            await this.editorEngine.history.push({
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
            const adjustedRect = adaptRectToCanvas(domEl.rect, frameView);
            this.editorEngine.overlay.state.updateTextEditor(adjustedRect);
            await this.editorEngine.overlay.refresh();
        } catch (error) {
            console.error('Error handling edited text:', error);
        }
    }

    async editSelectedElement(): Promise<void> {
        if (this.shouldNotStartEditing) {
            return;
        }

        try {
            const selected = this.editorEngine.elements.selected;
            if (selected.length === 0) {
                console.error('No selected elements found');
                return;
            }

            const selectedEl = selected[0];
            if (!selectedEl) {
                console.error('No selected element found');
                return;
            }

            const frameData = this.editorEngine.frames.get(selectedEl.frameId);
            if (!frameData?.view) {
                console.error('No frameView found for selected element');
                return;
            }

            const domEl = (await frameData.view.getElementByDomId(
                selectedEl.domId,
                true,
            )) as DomElement;
            if (!domEl) {
                return;
            }

            await this.start(domEl, frameData.view);
        } catch (error) {
            console.error('Error editing selected element:', error);
            return;
        }
    }

    async editElementAtLoc(pos: ElementPosition, frameView: WebFrameView): Promise<void> {
        try {
            const el = (await frameView.getElementAtLoc(pos.x, pos.y, true)) as DomElement;
            if (!el) {
                console.error('Failed to get element at location');
                return;
            }
            await this.start(el, frameView);
        } catch (error) {
            console.error('Error editing element at location:', error);
            return;
        }
    }
}
