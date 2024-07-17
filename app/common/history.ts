import { Action, Change } from './actions';

function reverse<T>(change: Change<T>): Change<T> {
    return { updated: change.original, original: change.updated };
}

function undoAction(action: Action): Action {
    switch (action.type) {
        case 'update-style':
            return {
                type: 'update-style',
                targets: action.targets,
                style: action.style,
                change: reverse(action.change),
            };
    }
}

enum TransactionType {
    IN_TRANSACTION = 'in-transaction',
    NOT_IN_TRANSACTION = 'not-in-transaction',
}

interface InTransaction {
    type: TransactionType.IN_TRANSACTION;
    action: Action | null;
}

interface NotInTransaction {
    type: TransactionType.NOT_IN_TRANSACTION;
}

type TransactionState = InTransaction | NotInTransaction;

export class History {
    constructor(
        private undoStack: Action[] = [],
        private redoStack: Action[] = [],
        private inTransaction: TransactionState = { type: TransactionType.NOT_IN_TRANSACTION },
    ) {}

    startTransaction = () => {
        this.inTransaction = { type: TransactionType.IN_TRANSACTION, action: null };
    };

    commitTransaction = () => {
        if (
            this.inTransaction.type === TransactionType.NOT_IN_TRANSACTION ||
            this.inTransaction.action == null
        ) {
            return;
        }

        const actionToCommit = this.inTransaction.action;

        this.inTransaction = { type: TransactionType.NOT_IN_TRANSACTION };

        this.push(actionToCommit);
    };

    push = (action: Action) => {
        if (this.inTransaction.type === TransactionType.IN_TRANSACTION) {
            this.inTransaction.action = action;
            return;
        }

        if (this.redoStack.length > 0) {
            this.redoStack = [];
        }

        this.undoStack.push(action);
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
}
