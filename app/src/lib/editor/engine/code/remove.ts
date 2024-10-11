import { ActionElementLocation } from '/common/actions';
import { CodeActionType, RemovedElement } from '/common/models/element/codeAction';

export function getRemovedElement(location: ActionElementLocation): RemovedElement {
    const removedElement: RemovedElement = {
        type: CodeActionType.REMOVE,
        location,
    };
    return removedElement;
}
