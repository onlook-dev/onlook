import { updateTransactionActions } from '@/lib/editor/engine/history/helpers';
import { type Action, type UpdateStyleAction } from '@onlook/models/actions';
import { StyleChangeType } from '@onlook/models/style';
import { describe, expect, it } from 'bun:test';

describe('updateTransactionActions', () => {
    it('should append new action of different type', () => {
        const actions = [{ type: 'update-style' } as Action];
        const newAction = { type: 'insert-element' } as Action;

        const result = updateTransactionActions(actions, newAction);

        expect(result).toHaveLength(2);
        expect(result[1]).toBe(newAction);
    });

    // Test case 1: Adding a new action when no action of same type exists
    it('should add new action when no action of same type exists', () => {
        const existingActions: Action[] = [
            {
                type: 'insert-element',
                targets: [{ webviewId: 'w1', domId: '1', oid: 'o1' }],
                location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
                element: {
                    domId: '1',
                    oid: 'o1',
                    tagName: 'div',
                    attributes: {},
                    styles: {},
                    textContent: null,
                    children: [],
                },
                editText: false,
                pasteParams: null,
                codeBlock: null,
            },
        ];
        const newAction: Action = {
            type: 'remove-element',
            targets: [{ webviewId: 'w1', domId: '2', oid: 'o2' }],
            location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
            element: {
                domId: '2',
                oid: 'o2',
                tagName: 'div',
                attributes: {},
                styles: {},
                textContent: null,
                children: [],
            },
            editText: false,
            pasteParams: null,
            codeBlock: null,
        };

        const result = updateTransactionActions(existingActions, newAction);
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(newAction);
    });

    // Test case 2: Replacing non-style action with new action of same type
    it('should replace existing non-style action with new action of same type', () => {
        const existingActions: Action[] = [
            {
                type: 'insert-element',
                targets: [{ webviewId: 'w1', domId: '1', oid: 'o1' }],
                location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
                element: {
                    domId: '1',
                    oid: 'o1',
                    tagName: 'div',
                    attributes: {},
                    styles: {},
                    textContent: null,
                    children: [],
                },
                editText: false,
                pasteParams: null,
                codeBlock: null,
            },
        ];
        const newAction: Action = {
            type: 'insert-element',
            targets: [{ webviewId: 'w1', domId: '2', oid: 'o2' }],
            location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
            element: {
                domId: '2',
                oid: 'o2',
                tagName: 'div',
                attributes: {},
                styles: {},
                textContent: null,
                children: [],
            },
            editText: false,
            pasteParams: null,
            codeBlock: null,
        };

        const result = updateTransactionActions(existingActions, newAction);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newAction);
    });

    // Test case 3: Merging style actions for same target
    it('should merge style changes for same target', () => {
        const existingAction: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    domId: '1',
                    webviewId: 'w1',
                    oid: 'o1',
                    change: {
                        updated: { color: { value: 'red', type: StyleChangeType.Value } },
                        original: { color: { value: 'blue', type: StyleChangeType.Value } },
                    },
                },
            ],
        };

        const newAction: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    domId: '1',
                    webviewId: 'w1',
                    oid: 'o1',
                    change: {
                        updated: { fontSize: { value: '16px', type: StyleChangeType.Value } },
                        original: { fontSize: { value: '14px', type: StyleChangeType.Value } },
                    },
                },
            ],
        };

        const result = updateTransactionActions([existingAction], newAction);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('update-style');
        const mergedTarget = (result[0] as UpdateStyleAction).targets[0];
        expect(mergedTarget.change.updated).toEqual({
            color: { value: 'red', type: StyleChangeType.Value },
            fontSize: { value: '16px', type: StyleChangeType.Value },
        });
        expect(mergedTarget.change.original).toEqual({
            color: { value: 'blue', type: StyleChangeType.Value },
            fontSize: { value: '14px', type: StyleChangeType.Value },
        });
    });

    // Test case 4: Handling multiple style targets
    it('should handle multiple style targets correctly', () => {
        const existingAction: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    domId: '1',
                    webviewId: 'w1',
                    oid: 'o1',
                    change: {
                        updated: { color: { value: 'red', type: StyleChangeType.Value } },
                        original: { color: { value: 'blue', type: StyleChangeType.Value } },
                    },
                },
                {
                    domId: '2',
                    webviewId: 'w1',
                    oid: 'o2',
                    change: {
                        updated: { color: { value: 'green', type: StyleChangeType.Value } },
                        original: { color: { value: 'yellow', type: StyleChangeType.Value } },
                    },
                },
            ],
        };

        const newAction: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    domId: '1',
                    webviewId: 'w1',
                    oid: 'o1',
                    change: {
                        updated: { fontSize: { value: '16px', type: StyleChangeType.Value } },
                        original: { fontSize: { value: '14px', type: StyleChangeType.Value } },
                    },
                },
            ],
        };

        const result = updateTransactionActions([existingAction], newAction);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('update-style');
        const targets = (result[0] as UpdateStyleAction).targets;
        expect(targets).toHaveLength(2);

        // First target should be merged
        expect(targets[0].change.updated).toEqual({
            color: { value: 'red', type: StyleChangeType.Value },
            fontSize: { value: '16px', type: StyleChangeType.Value },
        });

        // Second target should remain unchanged
        expect(targets[1].change.updated).toEqual({
            color: { value: 'green', type: StyleChangeType.Value },
        });
    });

    // Test case 5: Empty actions array
    it('should handle empty actions array', () => {
        const newAction: Action = {
            type: 'insert-element',
            targets: [{ webviewId: 'w1', domId: '1', oid: 'o1' }],
            location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
            element: {
                domId: '1',
                oid: 'o1',
                tagName: 'div',
                attributes: {},
                styles: {},
                textContent: null,
                children: [],
            },
            editText: false,
            pasteParams: null,
            codeBlock: null,
        };
        const result = updateTransactionActions([], newAction);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newAction);
    });

    // Test case 6: Multiple actions of different types
    it('should handle multiple actions of different types', () => {
        const existingActions: Action[] = [
            {
                type: 'insert-element',
                targets: [{ webviewId: 'w1', domId: '1', oid: 'o1' }],
                location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
                element: {
                    domId: '1',
                    oid: 'o1',
                    tagName: 'div',
                    attributes: {},
                    styles: {},
                    textContent: null,
                    children: [],
                },
                editText: false,
                pasteParams: null,
                codeBlock: null,
            },
            { type: 'update-style', targets: [] },
        ];
        const newAction: Action = {
            type: 'insert-element',
            targets: [{ webviewId: 'w1', domId: '2', oid: 'o2' }],
            location: { type: 'append', targetDomId: 'parent', targetOid: 'parent-oid' },
            element: {
                domId: '2',
                oid: 'o2',
                tagName: 'div',
                attributes: {},
                styles: {},
                textContent: null,
                children: [],
            },
            editText: false,
            pasteParams: null,
            codeBlock: null,
        };

        const result = updateTransactionActions(existingActions, newAction);
        expect(result).toHaveLength(2);
        expect(result.find((a) => a.type === 'insert-element')).toEqual(newAction);
        expect(result.find((a) => a.type === 'update-style')).toBeDefined();
    });

    // Test case 7: Custom style changes
    it('should handle custom style changes correctly', () => {
        const existingAction: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    domId: '1',
                    webviewId: 'w1',
                    oid: 'o1',
                    change: {
                        updated: { customStyle: { value: 'value1', type: StyleChangeType.Custom } },
                        original: {
                            customStyle: { value: 'original1', type: StyleChangeType.Custom },
                        },
                    },
                },
            ],
        };

        const newAction: UpdateStyleAction = {
            type: 'update-style',
            targets: [
                {
                    domId: '1',
                    webviewId: 'w1',
                    oid: 'o1',
                    change: {
                        updated: { customStyle: { value: 'value2', type: StyleChangeType.Custom } },
                        original: {
                            customStyle: { value: 'original2', type: StyleChangeType.Custom },
                        },
                    },
                },
            ],
        };

        const result = updateTransactionActions([existingAction], newAction);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('update-style');
        const mergedTarget = (result[0] as UpdateStyleAction).targets[0];
        expect(mergedTarget.change.updated).toEqual({
            customStyle: { value: 'value2', type: StyleChangeType.Custom },
        });
    });
});
