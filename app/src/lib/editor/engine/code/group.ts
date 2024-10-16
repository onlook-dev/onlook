import { getInsertedElement } from './insert';
import { ActionElement, ActionElementLocation, GroupActionTarget } from '/common/models/actions';
import { CodeActionType, CodeGroup } from '/common/models/actions/code';

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
