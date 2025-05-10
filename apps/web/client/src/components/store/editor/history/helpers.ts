import { EditorAttributes } from '@onlook/constants';
import type {
    Action,
    ActionElement,
    Change,
    GroupElementsAction,
    IndexActionLocation,
    InsertElementAction,
    RemoveElementAction,
    UngroupElementsAction,
    UpdateStyleAction,
    WriteCodeAction,
} from '@onlook/models/actions';
import { assertNever, createDomId, createOid } from '@onlook/utility';

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
            const removeAction: RemoveElementAction = {
                type: 'remove-element',
                targets: action.targets ? [...action.targets] : [],
                location: {
                    ...action.location,
                },
                element: getCleanedElement(
                    action.element,
                    action.element.domId,
                    action.element.oid,
                ),
                editText: null,
                pasteParams: null,
                codeBlock: null,
            };
            return removeAction;
        case 'remove-element':
            const insertAction: InsertElementAction = {
                type: 'insert-element',
                targets: action.targets ? [...action.targets] : [],
                location: {
                    ...action.location,
                },
                element: getCleanedElement(
                    action.element,
                    action.element.domId,
                    action.element.oid,
                ),
                editText: action.editText,
                pasteParams: action.pasteParams ? { ...action.pasteParams } : null,
                codeBlock: action.codeBlock,
            };
            return insertAction;
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
            const ungroupAction: UngroupElementsAction = {
                type: 'ungroup-elements',
                parent: {
                    ...action.parent,
                },
                container: {
                    ...action.container,
                    attributes: {
                        ...action.container.attributes,
                    },
                },
                children: action.children.map((child) => ({
                    frameId: child.frameId,
                    domId: child.domId,
                    oid: child.oid,
                })),
            };
            return ungroupAction;
        case 'ungroup-elements':
            const groupAction: GroupElementsAction = {
                type: 'group-elements',
                parent: {
                    ...action.parent,
                },
                container: {
                    ...action.container,
                    attributes: {
                        ...action.container.attributes,
                    },
                },
                children: action.children.map((child) => ({
                    frameId: child.frameId,
                    domId: child.domId,
                    oid: child.oid,
                })),
            };
            return groupAction;
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
        return handleUpdateStyleAction(actions, existingActionIndex, newAction);
    }

    return actions.map((a, i) => (i === existingActionIndex ? newAction : a));
}

export function getCleanedElement(
    copiedEl: ActionElement,
    domId: string,
    oid: string,
): ActionElement {
    const cleanedEl: ActionElement = {
        tagName: copiedEl.tagName,
        attributes: {
            class: copiedEl.attributes.class ?? '',
            [EditorAttributes.DATA_ONLOOK_DOM_ID]: domId,
            [EditorAttributes.DATA_ONLOOK_ID]: oid,
            [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
        },
        styles: { ...copiedEl.styles },
        textContent: copiedEl.textContent,
        children: [],
        domId,
        oid,
    };

    // Process children recursively
    if (copiedEl.children?.length) {
        cleanedEl.children = copiedEl.children.map((child: ActionElement): ActionElement => {
            const newChildDomId = createDomId();
            const newChildOid = createOid();
            return getCleanedElement(child, newChildDomId, newChildOid);
        });
    }

    return cleanedEl;
}

export function transformRedoAction(action: Action): Action {
    switch (action.type) {
        case 'insert-element':
        case 'remove-element':
            return {
                type: action.type,
                targets: action.targets ? [...action.targets] : [],
                location: { ...action.location },
                element: getCleanedElement(
                    action.element,
                    action.element.domId,
                    action.element.oid,
                ),
                editText: action.editText,
                pasteParams: action.pasteParams,
                codeBlock: action.codeBlock,
            };
        case 'group-elements':
        case 'ungroup-elements':
            return {
                type: action.type,
                parent: { ...action.parent },
                container: {
                    ...action.container,
                    attributes: { ...action.container.attributes },
                },
                children: action.children.map((child) => ({
                    frameId: child.frameId,
                    domId: child.domId,
                    oid: child.oid,
                })),
            };
        case 'update-style':
            return {
                type: 'update-style',
                targets: action.targets.map((target) => ({
                    ...target,
                    change: {
                        updated: { ...target.change.updated },
                        original: { ...target.change.original },
                    },
                })),
            };
        case 'move-element':
            return {
                type: 'move-element',
                targets: action.targets ? [...action.targets] : [],
                location: { ...action.location },
            };
        case 'edit-text':
            return {
                type: 'edit-text',
                targets: action.targets ? [...action.targets] : [],
                originalContent: action.originalContent,
                newContent: action.newContent,
            };
        case 'write-code':
            return {
                type: 'write-code',
                diffs: action.diffs.map((diff) => ({
                    ...diff,
                    original: diff.original,
                    generated: diff.generated,
                })),
            };
        case 'insert-image':
        case 'remove-image':
            return {
                ...action,
                type: action.type === 'insert-image' ? 'remove-image' : 'insert-image',
            };
        default:
            return action;
    }
}
