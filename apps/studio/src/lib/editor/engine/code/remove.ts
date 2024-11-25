import type { ActionElement, ActionLocation } from '@onlook/models/actions';
import { CodeActionType, type CodeRemove } from '@onlook/models/actions';

export function getRemovedElement(element: ActionElement): CodeRemove {
    const removedElement: CodeRemove = {
        oid: element.oid,
        type: CodeActionType.REMOVE,
    };
    return removedElement;
}
