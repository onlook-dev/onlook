import { getInsertedElement } from './insert';
import { ActionElement, ActionElementLocation, GroupActionTarget } from '/common/models/actions';
import { CodeActionType, CodeGroup, CodeUngroup } from '/common/models/actions/code';

export function getGroupElement(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
    container: ActionElement,
): CodeGroup {
    const containerInsert = getInsertedElement(container, location);
    const targetLocations: ActionElementLocation[] = targets.map((target) => {
        const targetLocation = { ...location, index: target.index };
        return targetLocation;
    });

    return {
        type: CodeActionType.GROUP,
        location,
        container: containerInsert,
        targets: targetLocations,
        uuid: container.uuid,
    };
}

export function getUngroupElement(
    targets: Array<GroupActionTarget>,
    location: ActionElementLocation,
    container: ActionElement,
): CodeUngroup {
    const groupElement = getGroupElement(targets, location, container);
    return {
        ...groupElement,
        type: CodeActionType.UNGROUP,
    };
}
