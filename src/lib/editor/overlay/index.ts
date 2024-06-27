import { ClickRect, EditRect, HoverRect, ParentRect } from "./rect";

export class OverlayManager {
    overlayContainer: HTMLElement | undefined;
    hoverRect: HoverRect
    clickedRects: ClickRect[]
    parentRect: ParentRect
    editRect: EditRect

    constructor() {
        this.hoverRect = new HoverRect();
        this.parentRect = new ParentRect();
        this.editRect = new EditRect();
        this.clickedRects = [];

        this.initializeRects()
        this.bindMethods()
    }

    initializeRects = () => {
        this.appendRectToPopover(this.hoverRect.element)
        this.appendRectToPopover(this.parentRect.element)
        this.appendRectToPopover(this.editRect.element)
    }

    bindMethods = () => {
        this.setOverlayContainer = this.setOverlayContainer.bind(this)
        this.updateHoverRect = this.updateHoverRect.bind(this)
        this.updateParentRect = this.updateParentRect.bind(this)
        this.updateEditRect = this.updateEditRect.bind(this)
        this.hideHoverRect = this.hideHoverRect.bind(this)
        this.showHoverRect = this.showHoverRect.bind(this)
        this.removeHoverRect = this.removeHoverRect.bind(this)
        this.removeEditRect = this.removeEditRect.bind(this)
        this.removeClickedRects = this.removeClickedRects.bind(this)
        this.clear = this.clear.bind(this)
    }

    // Helper function to calculate cumulative offset from the document body
    getCumulativeOffset(element: HTMLElement) {
        let top = 0, left = 0;
        do {
            top += element.offsetTop || 0;
            left += element.offsetLeft || 0;
            element = element.offsetParent as HTMLElement;
        } while (element);
        return { top, left };
    }

    // Updated adjustRect method
    adjustRect(rect: DOMRect, sourceWebview: Electron.WebviewTag) {
        // Calculate the cumulative offsets for sourceWebview and overlayContainer
        const sourceOffset = this.getCumulativeOffset(sourceWebview);
        const overlayOffset = this.overlayContainer ? this.getCumulativeOffset(this.overlayContainer) : { top: 0, left: 0 };

        // Calculate the adjusted position relative to the cumulative offset differences
        const adjustedRect = {
            ...rect,
            top: rect.top - overlayOffset.top + sourceOffset.top,
            left: rect.left - overlayOffset.left + sourceOffset.left,
        };

        return adjustedRect;
    };


    setOverlayContainer = (container: HTMLElement) => {
        this.overlayContainer = container;
        this.appendRectToPopover(this.hoverRect.element);
        this.appendRectToPopover(this.parentRect.element);
        this.appendRectToPopover(this.editRect.element);
    };

    appendRectToPopover = (rect: HTMLElement) => {
        if (this.overlayContainer) {
            this.overlayContainer.appendChild(rect);
        }
    };

    clear = () => {
        this.removeParentRect()
        this.removeHoverRect()
        this.removeClickedRects()
        this.removeEditRect()
    }

    addClickRect = (el: HTMLElement) => {
        if (!el) return
        const clickRect = new ClickRect()
        this.appendRectToPopover(clickRect.element)
        this.clickedRects.push(clickRect)

        const rect = el.getBoundingClientRect()
        const margin = window.getComputedStyle(el).margin
        const padding = window.getComputedStyle(el).padding
        clickRect.render({ width: rect.width, height: rect.height, top: rect.top, left: rect.left, padding, margin });
    }

    updateParentRect = (el: HTMLElement) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        this.parentRect.render(rect)
    }

    updateHoverRect = (rect: DOMRect) => {
        this.hoverRect.render(rect)
    }

    updateEditRect = (el: HTMLElement) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        this.editRect.render(rect)
    }

    hideHoverRect = () => {
        this.hoverRect.element.style.display = 'none'
    }

    showHoverRect = () => {
        this.hoverRect.element.style.display = 'block'
    }

    removeHoverRect = () => {
        this.hoverRect.render({ width: 0, height: 0, top: 0, left: 0 })
    }

    removeEditRect = () => {
        this.editRect.render({ width: 0, height: 0, top: 0, left: 0 })
    }

    removeClickedRects = () => {
        this.clickedRects.forEach(clickRect => {
            clickRect.element.remove()
        })
        this.clickedRects = []
    }

    removeParentRect = () => {
        this.parentRect.render({ width: 0, height: 0, top: 0, left: 0 })
    }
}
