import { RouterType, type TemplateNode, type TemplateTag } from '@onlook/models';
import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { EditorEngine } from '../engine';
import { TemplateNodeManager } from './index';

// Mock the parser functions
mock.module('@onlook/parser', () => ({
    addOidsToAst: mock(() => ({ ast: {}, modified: true })),
    createTemplateNodeMap: mock(() => new Map()),
    getAstFromContent: mock(() => ({})),
    getContentFromAst: mock(async () => 'processed content'),
    getContentFromTemplateNode: mock(async () => 'template content'),
    getTemplateNodeChild: mock(async () => ({ instanceId: 'test-instance', component: 'TestComponent' })),
    injectPreloadScript: mock(() => {}),
}));

// Mock utility functions
mock.module('@onlook/utility/src/path', () => ({
    isRootLayoutFile: mock(() => false),
}));

mock.module('../sandbox/helpers', () => ({
    formatContent: mock(async (filePath: string, content: string) => content),
}));

describe('TemplateNodeManager', () => {
    let manager: TemplateNodeManager;
    let mockEditorEngine: EditorEngine;

    beforeEach(() => {
        mockEditorEngine = {
            branches: {
                activeBranch: { id: 'test-branch' },
                getSandboxById: mock(() => ({
                    readFile: mock(async () => ({ type: 'text', content: 'file content' })),
                })),
            },
        } as any;
        manager = new TemplateNodeManager(mockEditorEngine);
    });

    const createMockTemplateNode = (id: string, name: string): TemplateNode => {
        const mockTemplateTag: TemplateTag = {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 10 },
        };

        return {
            path: 'test.tsx',
            branchId: 'test-branch',
            startTag: mockTemplateTag,
            endTag: mockTemplateTag,
            component: name,
            dynamicType: null,
            coreElementType: null,
        };
    };

    test('processFileForMapping should process file and store template nodes by branch', async () => {
        // Arrange  
        const branchId = 'test-branch';
        const filePath = 'test.tsx';
        const fileContent = '<div>Test content</div>';

        // Act
        const result = await manager.processFileForMapping(branchId, filePath, fileContent);

        // Assert
        expect(result).toHaveProperty('modified');
        expect(result).toHaveProperty('newContent');
        expect(typeof result.modified).toBe('boolean');
        expect(typeof result.newContent).toBe('string');
        
        // The template nodes would be stored by createTemplateNodeMap
        // but since we're mocking it to return empty map, we just verify the structure
        expect(result.modified).toBe(true);
        expect(result.newContent).toBe('processed content');
    });

    test('getTemplateNode should return node from global map', () => {
        // Arrange
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['templateNodes'].set('test-oid', templateNode);

        // Act
        const result = manager.getTemplateNode('test-oid');

        // Assert
        expect(result).toEqual(templateNode);
    });

    test('getTemplateNode should return null for non-existent OID', () => {
        // Act
        const result = manager.getTemplateNode('non-existent-oid');

        // Assert
        expect(result).toBeNull();
    });

    test('getTemplateNodeByBranch should return node for specific branch', () => {
        // Arrange
        const branchId = 'test-branch';
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['templateNodes'].set('test-oid', templateNode);

        // Act
        const result = manager.getTemplateNodeByBranch(branchId, 'test-oid');

        // Assert
        expect(result).toEqual(templateNode);
    });

    test('getTemplateNodeByBranch should return null for different branch', () => {
        // Arrange
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        templateNode.branchId = 'different-branch';
        manager['templateNodes'].set('test-oid', templateNode);

        // Act
        const result = manager.getTemplateNodeByBranch('test-branch', 'test-oid');

        // Assert
        expect(result).toBeNull();
    });

    test('clearBranch should remove all template nodes for branch', () => {
        // Arrange
        const branchId = 'test-branch';
        const templateNode1 = createMockTemplateNode('test-oid-1', 'TestComponent1');
        const templateNode2 = createMockTemplateNode('test-oid-2', 'TestComponent2');
        templateNode2.branchId = 'different-branch';
        
        manager['templateNodes'].set('test-oid-1', templateNode1);
        manager['templateNodes'].set('test-oid-2', templateNode2);

        // Act
        manager.clearBranch(branchId);

        // Assert
        expect(manager.getTemplateNode('test-oid-1')).toBeNull(); // Should be removed
        expect(manager.getTemplateNode('test-oid-2')).toEqual(templateNode2); // Should remain
    });

    test('clear should remove all template nodes for all branches', () => {
        // Arrange
        const templateNode1 = createMockTemplateNode('oid-1', 'Component1');
        templateNode1.branchId = 'branch-1';
        const templateNode2 = createMockTemplateNode('oid-2', 'Component2');
        templateNode2.branchId = 'branch-2';
        
        manager['templateNodes'].set('oid-1', templateNode1);
        manager['templateNodes'].set('oid-2', templateNode2);

        // Act
        manager.clear();

        // Assert
        expect(manager.getTemplateNode('oid-1')).toBeNull();
        expect(manager.getTemplateNode('oid-2')).toBeNull();
        expect(manager['templateNodes'].size).toBe(0);
    });

    test('getCodeBlock should get template node and read file content', async () => {
        // Arrange
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['templateNodes'].set('test-oid', templateNode);

        // Act
        const result = await manager.getCodeBlock('test-oid');

        // Assert
        expect(result).toBe('template content');
    });

    test('getCodeBlock should return null when template node not found', async () => {
        // Act
        const result = await manager.getCodeBlock('non-existent-oid');

        // Assert
        expect(result).toBeNull();
    });

    test('getTemplateNodeChild should call parser function with code block', async () => {
        // Arrange
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        const childTemplateNode = createMockTemplateNode('child-oid', 'ChildComponent');
        manager['templateNodes'].set('test-oid', templateNode);

        const getCodeBlockSpy = spyOn(manager, 'getCodeBlock').mockResolvedValue('code block content');

        // Act
        const result = await manager.getTemplateNodeChild('test-oid', childTemplateNode, 0);

        // Assert
        expect(getCodeBlockSpy).toHaveBeenCalledWith('test-oid');
        expect(result).toEqual({ instanceId: 'test-instance', component: 'TestComponent' });
    });

    test('getAllOids should return all OIDs in the global map', () => {
        // Arrange
        const templateNode1 = createMockTemplateNode('oid-1', 'Component1');
        const templateNode2 = createMockTemplateNode('oid-2', 'Component2');
        manager['templateNodes'].set('oid-1', templateNode1);
        manager['templateNodes'].set('oid-2', templateNode2);

        // Act
        const result = manager.getAllOids();

        // Assert
        expect(result).toEqual(new Set(['oid-1', 'oid-2']));
    });

    test('getBranchOidMap should return mapping of OIDs to branch IDs', () => {
        // Arrange
        const templateNode1 = createMockTemplateNode('oid-1', 'Component1');
        templateNode1.branchId = 'branch-1';
        const templateNode2 = createMockTemplateNode('oid-2', 'Component2');
        templateNode2.branchId = 'branch-2';
        manager['templateNodes'].set('oid-1', templateNode1);
        manager['templateNodes'].set('oid-2', templateNode2);

        // Act
        const result = manager.getBranchOidMap();

        // Assert
        expect(result.get('oid-1')).toBe('branch-1');
        expect(result.get('oid-2')).toBe('branch-2');
        expect(result.size).toBe(2);
    });

    test('processFileForMapping should preserve existing OIDs from same branch on multiple calls', async () => {
        // Arrange  
        const branchId = 'test-branch';
        const filePath = 'test.tsx';
        const fileContent = '<div>Test content</div>';

        // Mock addOidsToAst to simulate existing OIDs being preserved
        const { addOidsToAst } = await import('@onlook/parser');
        const mockAddOidsToAst = addOidsToAst as any;
        
        // First call - simulate OIDs being added
        mockAddOidsToAst.mockReturnValueOnce({ ast: { modified: true }, modified: true });
        
        // Second call - simulate OIDs being preserved (no modification)
        mockAddOidsToAst.mockReturnValueOnce({ ast: { modified: false }, modified: false });

        // Act - First processing
        const result1 = await manager.processFileForMapping(branchId, filePath, fileContent);
        
        // Act - Second processing (should preserve OIDs)
        const result2 = await manager.processFileForMapping(branchId, filePath, fileContent);

        // Assert
        expect(result1.modified).toBe(true); // First time should add OIDs
        expect(result2.modified).toBe(false); // Second time should preserve existing OIDs
        
        // Verify addOidsToAst was called with branch context
        expect(mockAddOidsToAst).toHaveBeenCalledWith(
            expect.anything(), // ast
            expect.any(Set), // globalOids
            expect.any(Map), // branchOidMap
            branchId // currentBranchId
        );
    });
});