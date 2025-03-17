import { expect, describe, beforeEach, it, mock } from 'bun:test';
import { StyleChangeType, type Action } from '@onlook/models/actions';

// Create mock classes that mirror the real ones
class MockEditorEngine {
    code = {
        write: mock((action: Action) => {}),
    };
    project = {};
    pages = {};
    components = {};
    styles = {};
}

class MockHistoryManager {
    private undoStack: Action[] = [];
    private redoStack: Action[] = [];
    private inTransaction: { type: 'in-transaction' | 'not-in-transaction'; actions?: Action[] };

    constructor(private editorEngine: MockEditorEngine) {
        this.inTransaction = { type: 'not-in-transaction' };
    }

    get canUndo() {
        return this.undoStack.length > 0;
    }

    get canRedo() {
        return this.redoStack.length > 0;
    }

    get isInTransaction() {
        return this.inTransaction.type === 'in-transaction';
    }

    get length() {
        return this.undoStack.length;
    }

    startTransaction = () => {
        this.inTransaction = { type: 'in-transaction', actions: [] };
    };

    commitTransaction = () => {
        if (
            this.inTransaction.type === 'not-in-transaction' ||
            !this.inTransaction.actions?.length
        ) {
            return;
        }

        const actionsToCommit = this.inTransaction.actions;
        this.inTransaction = { type: 'not-in-transaction' };
        for (const action of actionsToCommit) {
            this.push(action);
        }
    };

    push = (action: Action) => {
        if (this.inTransaction.type === 'in-transaction' && this.inTransaction.actions) {
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
    };

    clear = () => {
        this.undoStack = [];
        this.redoStack = [];
    };
}

describe('HistoryManager', () => {
    let historyManager: MockHistoryManager;
    let mockEditorEngine: MockEditorEngine;

    beforeEach(() => {
        // Reset all mocks
        mock.restore();

        // Create mock editor engine
        mockEditorEngine = new MockEditorEngine();

        // Initialize history manager
        historyManager = new MockHistoryManager(mockEditorEngine);
    });

    describe('push', () => {
        it('should handle actions in transaction mode', () => {
            // Start a transaction
            historyManager.startTransaction();

            // Push an action
            const action: Action = {
                type: 'update-style',
                targets: [
                    {
                        webviewId: '1',
                        domId: '1',
                        oid: '1',
                        change: {
                            original: {},
                            updated: { color: { value: 'red', type: StyleChangeType.Custom } },
                        },
                    },
                ],
            };

            historyManager.push(action);

            // Verify action is added to transaction
            expect(historyManager.isInTransaction).toBe(true);
            expect(mockEditorEngine.code.write).not.toHaveBeenCalled();

            // Commit transaction
            historyManager.commitTransaction();

            // Verify action is processed
            expect(mockEditorEngine.code.write).toHaveBeenCalledWith(action);
        });

        it('should overwrite existing action of same type in transaction', () => {
            historyManager.startTransaction();

            const action1: Action = {
                type: 'update-style',
                targets: [
                    {
                        webviewId: '1',
                        domId: '1',
                        oid: '1',
                        change: {
                            original: {},
                            updated: { color: { value: 'red', type: StyleChangeType.Custom } },
                        },
                    },
                ],
            };

            const action2: Action = {
                type: 'update-style',
                targets: [
                    {
                        webviewId: '1',
                        domId: '1',
                        oid: '1',
                        change: {
                            original: {},
                            updated: { color: { value: 'blue', type: StyleChangeType.Custom } },
                        },
                    },
                ],
            };

            historyManager.push(action1);
            historyManager.push(action2);

            historyManager.commitTransaction();

            // Verify only the latest action is processed
            expect(mockEditorEngine.code.write).toHaveBeenCalledTimes(1);
            expect(mockEditorEngine.code.write).toHaveBeenCalledWith(action2);
        });
    });
});
