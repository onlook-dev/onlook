import { sendAnalytics } from '@/lib/utils';
import type {
    Action,
    Change,
    IndexActionLocation,
    UpdateStyleAction,
    WriteCodeAction,
} from '@onlook/models/actions';
import { jsonClone } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { assertNever } from '/common/helpers';

function reverse<T>(change: Change<T>): Change<T> {
    return { updated: change.original, original: change.updated };
}

function reverseMoveLocation(location: IndexActionLocation): IndexActionLocation {
    return {
        ...location,
        index: location.originalIndex,
        originalIndex: location.index,
    };
}

function reverseStyleAction(action: UpdateStyleAction): UpdateStyleAction {
    return {
        ...action,
        targets: action.targets.map((target) => ({
            ...target,
            change: reverse(target.change),
        })),
    };
}

function reverseWriteCodeAction(action: WriteCodeAction): WriteCodeAction {
    return {
        ...action,
        diffs: action.diffs.map((diff) => ({
            ...diff,
            original: diff.generated,
            generated: diff.original,
        })),
    };
}

function undoAction(action: Action): Action {
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

enum TransactionType {
    IN_TRANSACTION = 'in-transaction',
    NOT_IN_TRANSACTION = 'not-in-transaction',
}

interface InTransaction {
    type: TransactionType.IN_TRANSACTION;
    actions: Action[];
}

interface NotInTransaction {
    type: TransactionType.NOT_IN_TRANSACTION;
}

type TransactionState = InTransaction | NotInTransaction;

export class HistoryManager {
    constructor(
        private editorEngine: EditorEngine,
        private undoStack: Action[] = [],
        private redoStack: Action[] = [],
        private inTransaction: TransactionState = { type: TransactionType.NOT_IN_TRANSACTION },
    ) {
        makeAutoObservable(this);
    }

    get canUndo() {
        return this.undoStack.length > 0;
    }

    get canRedo() {
        return this.redoStack.length > 0;
    }

    get isInTransaction() {
        return this.inTransaction.type === TransactionType.IN_TRANSACTION;
    }

    get length() {
        return this.undoStack.length;
    }

    startTransaction = () => {
        this.inTransaction = { type: TransactionType.IN_TRANSACTION, actions: [] };
    };

    commitTransaction = () => {
        if (
            this.inTransaction.type === TransactionType.NOT_IN_TRANSACTION ||
            this.inTransaction.actions.length === 0
        ) {
            return;
        }

        const actionsToCommit = this.inTransaction.actions;
        this.inTransaction = { type: TransactionType.NOT_IN_TRANSACTION };
        for (const action of actionsToCommit) {
            this.push(action);
        }
    };

    push = (action: Action) => {
        if (this.inTransaction.type === TransactionType.IN_TRANSACTION) {
            // Only allow one action per type, otherwise, overwrite the existing action
            if (this.inTransaction.actions.some((a) => a.type === action.type)) {
                this.inTransaction.actions = this.inTransaction.actions.map((a) =>
                    a.type === action.type ? action : a,
                );
                return;
            }
            this.inTransaction.actions.push(action);
            return;
        }

        if (this.redoStack.length > 0) {
            this.redoStack = [];
        }

        this.undoStack.push(action);
        this.editorEngine.code.write(action);

        switch (action.type) {
            case 'update-style':
                sendAnalytics('style action', {
                    style: jsonClone(
                        action.targets.length > 0 ? action.targets[0].change.updated : {},
                    ),
                });
                break;
            case 'insert-element':
                sendAnalytics('insert action');
                break;
            case 'move-element':
                sendAnalytics('move action');
                break;
            case 'remove-element':
                sendAnalytics('remove action');
                break;
            case 'edit-text':
                sendAnalytics('edit text action');
        }
    };

    undo = (): Action | null => {
        if (this.inTransaction.type === TransactionType.IN_TRANSACTION) {
            this.commitTransaction();
        }

        const top = this.undoStack.pop();
        if (top == null) {
            return null;
        }

        this.redoStack.push(top);
        return undoAction(top);
    };

    redo = (): Action | null => {
        if (this.inTransaction.type === TransactionType.IN_TRANSACTION) {
            this.commitTransaction();
        }

        const top = this.redoStack.pop();
        if (top == null) {
            return null;
        }

        this.undoStack.push(top);
        return top;
    };

    clear = () => {
        this.undoStack = [];
        this.redoStack = [];
    };
}
