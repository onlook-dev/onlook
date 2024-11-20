import type { ActionElement, ActionLocation, GroupActionTarget } from '@onlook/models/actions';
import { CodeActionType, type CodeGroup, type CodeUngroup } from '@onlook/models/actions';
import { getInsertedElement } from './insert';

export function getGroupElement(
    targets: Array<GroupActionTarget>,
    location: ActionLocation,
    container: ActionElement,
): CodeGroup {
    const containerInsert = getInsertedElement(container, location);

    return {
        type: CodeActionType.GROUP,
        location,
        container: containerInsert,
        targets,
        uuid: container.uuid,
    };
}

export function getUngroupElement(
    targets: Array<GroupActionTarget>,
    location: ActionLocation,
    container: ActionElement,
): CodeUngroup {
    const groupElement = getGroupElement(targets, location, container);
    return {
        ...groupElement,
        type: CodeActionType.UNGROUP,
    };
}
