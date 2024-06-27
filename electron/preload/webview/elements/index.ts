import { EditorAttributes } from "../../../../common/constants";
import { ElementMetadata } from "../../../../common/models";
import { finder } from "./finder";

export const handleMouseEvent = (e: MouseEvent): Object => {
    const el = deepElementFromPoint(e.clientX, e.clientY)
    if (!el) return { coordinates: { x: e.clientX, y: e.clientY } }

    const rect = el.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(el)
    const selector = getUniqueSelector(el as HTMLElement)
    return {
        selector,
        rect,
        computedStyle,
    } as ElementMetadata
}

export const getUniqueSelector = (el: HTMLElement): string => {
    let selector = el.tagName.toLowerCase()
    // If data-onlook-component-id exists, use that
    if (el.hasAttribute(EditorAttributes.DATA_ONLOOK_COMPONENT_ID)) {
        return `[${EditorAttributes.DATA_ONLOOK_COMPONENT_ID}="${el.getAttribute(EditorAttributes.DATA_ONLOOK_COMPONENT_ID)}"]`
    }

    try {
        if (el.nodeType !== Node.ELEMENT_NODE) { return selector }
        selector = finder(el, { className: () => false })
    } catch (e) {
        console.error("Error creating selector ", e);
    }
    return selector
}

export const deepElementFromPoint = (x: number, y: number): Element | undefined => {
    const el = document.elementFromPoint(x, y)
    if (!el) return
    const crawlShadows = (node: Element): Element => {
        if (node?.shadowRoot) {
            const potential = node.shadowRoot.elementFromPoint(x, y)
            if (potential == node) return node
            else if (potential?.shadowRoot) return crawlShadows(potential)
            else return potential || node
        }
        else return node
    }

    const nested_shadow = crawlShadows(el)
    return (nested_shadow || el)
}