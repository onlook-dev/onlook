import { sendAnalytics } from '@/lib/utils';
import type { Action, UpdateStyleAction } from '@onlook/models/actions';
import { jsonClone } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { undoAction, updateTransactionActions } from './helpers';

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
        private originalStyleMap: Map<string, UpdateStyleAction> = new Map(),
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
            this.inTransaction.actions = updateTransactionActions(
                this.inTransaction.actions,
                action,
            );
            if (action.type === 'update-style') {
                const oid = action.targets[0].oid || '';
                if (!this.originalStyleMap.has(oid)) {
                    this.originalStyleMap.set(action.targets[0].oid || '', action);
                }
            }
            return;
        }

        if (this.redoStack.length > 0) {
            this.redoStack = [];
        }

        let updatedAction = action;

        if (action.type === 'update-style' && action.targets.length > 0) {
            const oid = action.targets[0].oid || '';
            if (this.originalStyleMap.has(oid)) {
                const originalValue = this.originalStyleMap.get(oid);

                updatedAction = {
                    ...action,
                    targets: action.targets.map((target, idx) => {
                        const original = originalValue?.targets[idx]?.change.original ?? {};
                        return {
                            ...target,
                            change: {
                                original,
                                updated: target.change.updated,
                            },
                        };
                    }),
                };
            }
        }

        this.undoStack.push(updatedAction);
        this.editorEngine.code.write(updatedAction);

        this.originalStyleMap.clear();

        switch (updatedAction.type) {
            case 'update-style':
                sendAnalytics('style action', {
                    style: jsonClone(
                        updatedAction.targets.length > 0
                            ? updatedAction.targets[0].change.updated
                            : {},
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
