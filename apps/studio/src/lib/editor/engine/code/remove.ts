import type { ActionElement, ActionElementLocation } from '@onlook/models/actions';
import { CodeActionType, type CodeRemove } from '@onlook/models/actions';

export function getRemovedElement(
    location: ActionElementLocation,
    element: ActionElement,
): CodeRemove {
    const removedElement: CodeRemove = {
        oid: element.oid,
        type: CodeActionType.REMOVE,
        location,
        codeBlock: null,
    };
    return removedElement;
}
