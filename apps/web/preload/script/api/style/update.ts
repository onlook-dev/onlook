import type { Change, DomElement, StyleChange } from "@onlook/models";
import { cssManager } from ".";
import { getElementByDomId } from "../elements";

export function updateStyle(domId: string, change: Change<Record<string, StyleChange>>): string {
    cssManager.updateStyle(domId, change.updated);
    return domId;
}
