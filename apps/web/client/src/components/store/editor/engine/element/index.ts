import type { Frame } from '@onlook/models';
import type { DomElement } from '@onlook/models/element';
import { toast } from '@onlook/ui-v4/use-toast';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import type { FrameData } from '../frames';
import { adaptRectToCanvas } from '../overlay/utils';

export class ElementsManager {
    private hoveredElement: DomElement | undefined;
    private selectedElements: DomElement[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get hovered() {
        return this.hoveredElement;
    }

    get selected() {
        return this.selectedElements;
    }

    set selected(elements: DomElement[]) {
        this.selectedElements = elements;
    }

    mouseover(domEl: DomElement, frameData: FrameData) {
        if (this.hoveredElement?.domId && this.hoveredElement.domId === domEl.domId) {
            return;
        }

        const frameEl: DomElement = {
            ...domEl,
            frameId: frameData.frame.id,
        };
        const { view } = frameData;
        const adjustedRect = adaptRectToCanvas(frameEl.rect, view);
        const isComponent = !!domEl.instanceId;
        this.editorEngine.overlay.state.updateHoverRect(adjustedRect, isComponent);
        this.setHoveredElement(frameEl);
    }

    shiftClick(domEl: DomElement, frameData: FrameData) {
        const selectedEls = this.selected;
        const isAlreadySelected = selectedEls.some((el) => el.domId === domEl.domId);
        let newSelectedEls: DomElement[] = [];
        if (isAlreadySelected) {
            newSelectedEls = selectedEls.filter((el) => el.domId !== domEl.domId);
        } else {
            newSelectedEls = [...selectedEls, domEl];
        }
        this.click(newSelectedEls, frameData);
    }

    click(domEls: DomElement[], frameData: FrameData) {
        const { view } = frameData;
        this.editorEngine.overlay.state.removeClickRects();
        this.clearSelectedElements();

        for (const domEl of domEls) {
            const adjustedRect = adaptRectToCanvas(domEl.rect, view);
            const isComponent = !!domEl.instanceId;
            this.editorEngine.overlay.state.addClickRect(
                adjustedRect,
                { ...domEl.styles?.computed, ...domEl.styles?.defined },
                isComponent,
            );
            this.addSelectedElement(domEl);
        }
    }

    async refreshSelectedElements(frame: Frame) {
        // const newSelected: DomElement[] = [];
        // for (const el of this.selected) {
        //     const newEl: DomElement | null = await frame.webview.executeJavaScript(
        //         `window.api?.getDomElementByDomId('${el.domId}', true)`,
        //     );
        //     if (!newEl) {
        //         console.error('Element not found');
        //         continue;
        //     }
        //     newSelected.push(newEl);
        // }
        // this.click(newSelected, frame);
    }

    setHoveredElement(element: DomElement) {
        this.hoveredElement = element;
    }

    clearHoveredElement() {
        this.hoveredElement = undefined;
    }

    addSelectedElement(element: DomElement) {
        this.selectedElements.push(element);
    }

    async delete() {
        const selected = this.selected;
        if (selected.length === 0) {
            return;
        }

        for (const selectedEl of selected) {
            const frameId = selectedEl.frameId;
            const frameData = this.editorEngine.frames.get(frameId);
            if (!frameData) {
                console.error('Frame data not found');
                return;
            }
            const { view, frame } = frameData;

            const { shouldDelete, error } = await this.shouldDelete(selectedEl, frameData);

            if (!shouldDelete) {
                toast({
                    title: 'Cannot delete element',
                    description: error,
                    variant: 'destructive',
                });
                return;
            }

            // const removeAction = (await view.executeJavaScript(
            //     `window.api?.getRemoveActionFromDomId('${selectedEl.domId}', '${frameId}')`,
            // )) as RemoveElementAction | null;
            // if (!removeAction) {
            //     console.error('Remove action not found');
            //     toast({
            //         title: 'Cannot delete element',
            //         description: 'Remove action not found. Try refreshing the page.',
            //         variant: 'destructive',
            //     });
            //     return;
            // }
            // const oid = selectedEl.instanceId || selectedEl.oid;
            // const codeBlock = await this.editorEngine.code.getCodeBlock(oid);
            // if (!codeBlock) {
            //     toast({
            //         title: 'Cannot delete element',
            //         description: 'Code block not found. Try refreshing the page.',
            //         variant: 'destructive',
            //     });
            //     return;
            // }

            // removeAction.codeBlock = codeBlock;
            // this.editorEngine.action.run(removeAction);
        }
    }

    private async shouldDelete(
        selectedEl: DomElement,
        frameData: FrameData,
    ): Promise<{
        shouldDelete: boolean;
        error?: string;
    }> {
        // const instanceId = selectedEl.instanceId;

        // if (!instanceId) {
        //     const {
        //         dynamicType,
        //         coreType,
        //     }: {
        //         dynamicType: DynamicType;
        //         coreType: CoreElementType;
        //     } = await frameData.view.executeJavaScript(
        //         `window.api?.getElementType('${selectedEl.domId}')`,
        //     );

        //     if (coreType) {
        //         const CORE_ELEMENTS_MAP: Record<CoreElementType, string> = {
        //             'component-root': 'Component Root',
        //             'body-tag': 'Body Tag',
        //         };

        //         return {
        //             shouldDelete: false,
        //             error: `This is a ${CORE_ELEMENTS_MAP[coreType]} and cannot be deleted`,
        //         };
        //     }

        //     if (dynamicType) {
        //         const DYNAMIC_TYPES_MAP: Record<DynamicType, string> = {
        //             array: 'Array',
        //             conditional: 'Conditional',
        //             unknown: 'Unknown',
        //         };

        //         return {
        //             shouldDelete: false,
        //             error: `This element is a(n) ${DYNAMIC_TYPES_MAP[dynamicType]} and cannot be deleted`,
        //         };
        //     }
        // }

        return {
            shouldDelete: true,
        };
    }

    clear() {
        this.clearHoveredElement();
        this.clearSelectedElements();
    }

    private clearSelectedElements() {
        this.selectedElements = [];
    }

}
