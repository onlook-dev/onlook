import type { Change, DomElement, StyleChange } from "@onlook/models";
import { cssManager } from "./css-manager";
import { getElementByDomId } from "../elements";

export function updateStyle(domId: string, change: Change<Record<string, StyleChange>>): DomElement | null {
    cssManager.updateStyle(domId, change.updated);
    const domEl = getElementByDomId(domId, true);
    
    return domEl;
}
