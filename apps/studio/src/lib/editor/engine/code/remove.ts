import type { ActionElement, ActionElementLocation } from '@onlook/types/actions';
import { CodeActionType, type CodeRemove } from '@onlook/types/actions/code';

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
