import type { ActionElement, ActionElementLocation } from '@onlook/models/actions';
import { CodeActionType, type CodeRemove } from '@onlook/models/actions';

export function getRemovedElement(
    location: ActionElementLocation,
    element: ActionElement,
): CodeRemove {
    const removedElement: CodeRemove = {
        type: CodeActionType.REMOVE,
        location,
        uuid: element.uuid,
    };
    return removedElement;
}
