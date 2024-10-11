import { ActionElementLocation } from '/common/models/actions';
import { CodeActionType, CodeRemove } from '/common/models/actions/code';

export function getRemovedElement(location: ActionElementLocation): CodeRemove {
    const removedElement: CodeRemove = {
        type: CodeActionType.REMOVE,
        location,
    };
    return removedElement;
}
