import type {
    Action,
    Change,
    IndexActionLocation,
    UpdateStyleAction,
    WriteCodeAction,
} from '@onlook/models/actions';
import { assertNever } from '/common/helpers';

export function reverse<T>(change: Change<T>): Change<T> {
    return { updated: change.original, original: change.updated };
}

export function reverseMoveLocation(location: IndexActionLocation): IndexActionLocation {
    return {
        ...location,
        index: location.originalIndex,
        originalIndex: location.index,
    };
}

export function reverseStyleAction(action: UpdateStyleAction): UpdateStyleAction {
    return {
        ...action,
        targets: action.targets.map((target) => ({
            ...target,
            change: reverse(target.change),
        })),
    };
}

export function reverseWriteCodeAction(action: WriteCodeAction): WriteCodeAction {
    return {
        ...action,
        diffs: action.diffs.map((diff) => ({
            ...diff,
            original: diff.generated,
            generated: diff.original,
        })),
    };
}

export function undoAction(action: Action): Action {
    switch (action.type) {
        case 'update-style':
            return reverseStyleAction(action);
        case 'insert-element':
            return {
                ...action,
                type: 'remove-element',
            };
        case 'remove-element':
            return {
                ...action,
                type: 'insert-element',
                editText: null,
            };
        case 'move-element':
            return {
                ...action,
                location: reverseMoveLocation(action.location),
            };
        case 'edit-text':
            return {
                ...action,
                originalContent: action.newContent,
                newContent: action.originalContent,
            };
        case 'group-elements':
            return {
                ...action,
                type: 'ungroup-elements',
            };
        case 'ungroup-elements':
            return {
                ...action,
                type: 'group-elements',
            };
        case 'write-code':
            return reverseWriteCodeAction(action);
        case 'insert-image':
            return {
                ...action,
                type: 'remove-image',
            };
        case 'remove-image':
            return {
                ...action,
                type: 'insert-image',
            };
        default:
            assertNever(action);
    }
}

export function updateTransactionActions(actions: Action[], newAction: Action): Action[] {
    // Only allow one action per type, otherwise, overwrite the existing action
    if (actions.some((a) => a.type === newAction.type)) {
        if (newAction.type === 'update-style') {
            const existingAction = actions.find(
                (a) => a.type === 'update-style',
            ) as UpdateStyleAction;
            if (existingAction) {
                // Create a new action with merged targets
                const mergedAction: UpdateStyleAction = {
                    type: 'update-style',
                    targets: [...existingAction.targets],
                };

                // Update or add targets from newAction
                newAction.targets.forEach((newTarget) => {
                    const existingTarget = mergedAction.targets.find(
                        (et) => et.domId === newTarget.domId,
                    );
                    if (existingTarget) {
                        existingTarget.change = {
                            updated: {
                                ...existingTarget.change.updated,
                                ...newTarget.change.updated,
                            },
                            original: {
                                ...existingTarget.change.original,
                                ...newTarget.change.original,
                            },
                        };
                    } else {
                        mergedAction.targets.push(newTarget);
                    }
                });

                return actions.map((a) => (a.type === 'update-style' ? mergedAction : a));
            }
        }

        return actions.map((a) => (a.type === newAction.type ? newAction : a));
    }
    return [...actions, newAction];
}
