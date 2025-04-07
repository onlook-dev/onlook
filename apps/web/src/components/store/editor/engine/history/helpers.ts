import type {
    Action,
    Change,
    IndexActionLocation,
    UpdateStyleAction,
    WriteCodeAction,
} from '@onlook/models/actions';
import { assertNever } from '@onlook/utility';

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

function handleUpdateStyleAction(
    actions: Action[],
    existingActionIndex: number,
    newAction: UpdateStyleAction,
): Action[] {
    const existingAction = actions[existingActionIndex] as UpdateStyleAction;
    const mergedTargets = [...existingAction.targets];

    for (const newTarget of newAction.targets) {
        const existingTarget = mergedTargets.find((et) => et.domId === newTarget.domId);

        if (existingTarget) {
            existingTarget.change = {
                updated: { ...existingTarget.change.updated, ...newTarget.change.updated },
                original: { ...existingTarget.change.original, ...newTarget.change.original },
            };
        } else {
            mergedTargets.push(newTarget);
        }
    }

    return actions.map((a, i) =>
        i === existingActionIndex ? { type: 'update-style', targets: mergedTargets } : a,
    );
}

export function updateTransactionActions(actions: Action[], newAction: Action): Action[] {
    const existingActionIndex = actions.findIndex((a) => a.type === newAction.type);
    if (existingActionIndex === -1) {
        return [...actions, newAction];
    }

    if (newAction.type === 'update-style') {
        return handleUpdateStyleAction(
            actions,
            existingActionIndex,
            newAction as UpdateStyleAction,
        );
    }

    return actions.map((a, i) => (i === existingActionIndex ? newAction : a));
}
