import { updateTransactionActions } from '@/lib/editor/engine/history/helpers';
import { type Action } from '@onlook/models/actions';
import { describe, expect, it } from 'bun:test';

describe('updateTransactionActions', () => {
    it('should append new action of different type', () => {
        const actions = [{ type: 'update-style' } as Action];
        const newAction = { type: 'insert-element' } as Action;

        const result = updateTransactionActions(actions, newAction);

        expect(result).toHaveLength(2);
        expect(result[1]).toBe(newAction);
    });

    it('should replace existing action of same type', () => {
        const actions = [{ type: 'update-style' } as Action];
        const newAction = { type: 'update-style' } as Action;

        const result = updateTransactionActions(actions, newAction);

        expect(result).toHaveLength(1);
        expect(result[0]).toBe(newAction);
    });
});
