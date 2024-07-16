export interface Change<T> {
    updated: T;
    original: T;
}

function reverse<T>(change: Change<T>): Change<T> {
    return { updated: change.original, original: change.updated };
}

export interface UpdateStyleAction {
    type: 'update-style';
    targets: Array<{ webviewId: string; selector: string }>;
    style: string;
    change: Change<string>;
}

export type Action = UpdateStyleAction;

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

interface Intransaction {
    type: 'in-transaction';
    action: Action | null;
}

interface NotInTransaction {
    type: 'not-in-transaction';
}

type TransactionState = Intransaction | NotInTransaction;

export class History {
    constructor(
        private undoStack: Action[] = [],
        private redoStack: Action[] = [],
        private inTransaction: TransactionState = { type: 'not-in-transaction' },
    ) {}

    startTransaction = () => {
        this.inTransaction = { type: 'in-transaction', action: null };
    };

    commitTransaction = () => {
        if (this.inTransaction.type === 'not-in-transaction' || this.inTransaction.action == null) {
            return;
        }

        const actionToCommit = this.inTransaction.action;

        this.inTransaction = { type: 'not-in-transaction' };

        this.push(actionToCommit);
    };

    push = (action: Action) => {
        if (this.inTransaction.type === 'in-transaction') {
            this.inTransaction.action = action;
            return;
        }

        if (this.redoStack.length > 0) {
            this.redoStack = [];
        }

        this.undoStack.push(action);
    };

    undo = (): Action | null => {
        if (this.inTransaction.type === 'in-transaction') {
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
