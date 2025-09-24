import { type TemplateNode, type TemplateTag } from '@onlook/models';
import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { EditorEngine } from '../../src/components/store/editor/engine';
import { TemplateNodeManager } from '../../src/components/store/editor/template-nodes/index';

// Mock the parser functions
mock.module('@onlook/parser', () => ({
    addOidsToAst: mock(() => ({ ast: {}, modified: true })),
    createTemplateNodeMap: mock(() => new Map()),
    getAstFromContent: mock(() => ({})),
    getContentFromAst: mock(async () => 'processed content'),
    getContentFromTemplateNode: mock(async () => 'template content'),
    getTemplateNodeChild: mock(async () => ({ instanceId: 'test-instance', component: 'TestComponent' })),
    injectPreloadScript: mock(() => { }),
}));

// Mock utility functions
mock.module('@onlook/utility/src/path', () => ({
    isRootLayoutFile: mock(() => false),
}));

mock.module('../../src/components/store/editor/sandbox/helpers', () => ({
    formatContent: mock(async (filePath: string, content: string) => content),
}));

// Mock localforage
mock.module('localforage', () => ({
    createInstance: mock(() => ({
        getItem: mock(async () => null),
        setItem: mock(async () => undefined),
        removeItem: mock(async () => undefined),
        clear: mock(async () => undefined),
    })),
}));

describe('TemplateNodeManager', () => {
    let manager: TemplateNodeManager;
    let mockEditorEngine: EditorEngine;

    beforeEach(async () => {
        mockEditorEngine = {
            branches: {
                activeBranch: { id: 'test-branch' },
                getSandboxById: mock(() => ({
                    readFile: mock(async () => ({ type: 'text', content: 'file content' })),
                })),
            },
        } as any;
        manager = new TemplateNodeManager(mockEditorEngine, 'test-project');
        await manager.init();
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

        // Clear any previous calls
        mockAddOidsToAst.mockClear();

        // Set up consistent return values
        mockAddOidsToAst.mockReturnValue({ ast: { modified: true }, modified: true });

        // Act - First processing
        const result1 = await manager.processFileForMapping(branchId, filePath, fileContent);

        // Act - Second processing (should use cache and skip processing)
        const result2 = await manager.processFileForMapping(branchId, filePath, fileContent);

        // Assert - Both should have the same result due to caching
        expect(result1.modified).toBe(true);
        expect(result2.modified).toBe(true); // Same as cached result
        expect(result1.newContent).toBe(result2.newContent);

        // Verify addOidsToAst was called at least once
        expect(mockAddOidsToAst).toHaveBeenCalledWith(
            expect.anything(), // ast
            expect.any(Set), // globalOids
            expect.any(Map), // branchOidMap
            branchId // currentBranchId
        );
    });

    test('should use cache for identical file content', async () => {
        // Arrange  
        const branchId = 'test-branch';
        const filePath = 'test.tsx';
        const fileContent = '<div>Test content</div>';

        // Mock parser functions to track calls
        const { createTemplateNodeMap } = await import('@onlook/parser');
        const mockCreateTemplateNodeMap = createTemplateNodeMap as any;
        mockCreateTemplateNodeMap.mockClear();

        // Act - First processing
        await manager.processFileForMapping(branchId, filePath, fileContent);
        const firstCallCount = mockCreateTemplateNodeMap.mock.calls.length;

        // Act - Second processing with same content
        await manager.processFileForMapping(branchId, filePath, fileContent);
        const secondCallCount = mockCreateTemplateNodeMap.mock.calls.length;

        // Assert - Second call should use cache and not reprocess
        expect(secondCallCount).toBe(firstCallCount); // Should use cached result
    });

    test('should invalidate cache when file content changes', async () => {
        // Arrange  
        const branchId = 'test-branch';
        const filePath = 'test.tsx';
        const originalContent = '<div>Original content</div>';
        const modifiedContent = '<div>Modified content</div>';

        // Mock parser functions to track calls
        const { createTemplateNodeMap } = await import('@onlook/parser');
        const mockCreateTemplateNodeMap = createTemplateNodeMap as any;
        mockCreateTemplateNodeMap.mockClear();

        // Act - First processing
        await manager.processFileForMapping(branchId, filePath, originalContent);
        const firstCallCount = mockCreateTemplateNodeMap.mock.calls.length;

        // Act - Second processing with different content
        await manager.processFileForMapping(branchId, filePath, modifiedContent);
        const secondCallCount = mockCreateTemplateNodeMap.mock.calls.length;

        // Assert - Second call should reprocess due to content change
        expect(secondCallCount).toBe(firstCallCount + 1); // Should process again
    });

    test('should handle clear operation', async () => {
        // Arrange  
        const branchId = 'test-branch';
        const filePath = 'test.tsx';
        const fileContent = '<div>Test content</div>';

        // Process a file to populate cache
        await manager.processFileForMapping(branchId, filePath, fileContent);

        // Act
        await manager.clear();

        // Assert - Template nodes should be cleared
        expect(manager.getAllTemplateNodes().size).toBe(0);
    });

    test('should handle large files efficiently', async () => {
        // Arrange  
        const branchId = 'test-branch';
        const filePath = 'large.tsx';
        const largeContent = '<div>' + 'x'.repeat(2000000) + '</div>'; // 2MB+ content

        // Act - Should handle large files without caching due to size limit
        const result = await manager.processFileForMapping(branchId, filePath, largeContent);

        // Assert
        expect(result).toHaveProperty('modified');
        expect(result).toHaveProperty('newContent');
        expect(typeof result.modified).toBe('boolean');
        expect(typeof result.newContent).toBe('string');
    });

    test('should maintain separate caches for different branches', async () => {
        // Arrange  
        const branch1Id = 'branch-1';
        const branch2Id = 'branch-2';
        const filePath = 'test.tsx';
        const fileContent = '<div>Test content</div>';

        // Create mock template nodes with different branch IDs
        const node1 = createMockTemplateNode('oid1', 'Component1');
        node1.branchId = branch1Id;
        const node2 = createMockTemplateNode('oid2', 'Component2');
        node2.branchId = branch2Id;

        // Mock to return different template node maps
        const { createTemplateNodeMap } = await import('@onlook/parser');
        const mockCreateTemplateNodeMap = createTemplateNodeMap as any;
        mockCreateTemplateNodeMap
            .mockReturnValueOnce(new Map([['oid1', node1]]))
            .mockReturnValueOnce(new Map([['oid2', node2]]));

        // Act - Process same file for different branches
        await manager.processFileForMapping(branch1Id, filePath, fileContent);
        await manager.processFileForMapping(branch2Id, filePath, fileContent);

        // Assert - Each branch should have its own template nodes
        const branch1Nodes = manager.getBranchTemplateNodes(branch1Id);
        const branch2Nodes = manager.getBranchTemplateNodes(branch2Id);

        expect(branch1Nodes.size).toBeGreaterThan(0);
        expect(branch2Nodes.size).toBeGreaterThan(0);
        // Nodes should be different between branches
        expect(Array.from(branch1Nodes.keys())).not.toEqual(Array.from(branch2Nodes.keys()));
    });
});