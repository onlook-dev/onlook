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

    test('getTemplateNode should return node for active branch', () => {
        // Arrange
        const branchId = 'test-branch';
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['branchTemplateNodes'].set(branchId, new Map([['test-oid', templateNode]]));

        // Act
        const result = manager.getTemplateNode('test-oid');

        // Assert
        expect(result).toEqual(templateNode);
    });

    test('getTemplateNode should throw error when no active branch', () => {
        // Arrange
        const mockEditorEngineNoActiveBranch = {
            branches: {
                activeBranch: null,
                getSandboxById: mock(() => null),
            },
        } as any;
        const managerNoActiveBranch = new TemplateNodeManager(mockEditorEngineNoActiveBranch);

        // Act & Assert
        expect(() => managerNoActiveBranch.getTemplateNode('test-oid')).toThrow('No active branch found');
    });

    test('getTemplateNodeByBranch should return node for specific branch', () => {
        // Arrange
        const branchId = 'test-branch';
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['branchTemplateNodes'].set(branchId, new Map([['test-oid', templateNode]]));

        // Act
        const result = manager.getTemplateNodeByBranch(branchId, 'test-oid');

        // Assert
        expect(result).toEqual(templateNode);
    });

    test('getTemplateNodeByBranch should return null for non-existent branch', () => {
        // Act
        const result = manager.getTemplateNodeByBranch('non-existent-branch', 'test-oid');

        // Assert
        expect(result).toBeNull();
    });

    test('clearBranch should remove all template nodes for branch', () => {
        // Arrange
        const branchId = 'test-branch';
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['branchTemplateNodes'].set(branchId, new Map([['test-oid', templateNode]]));

        // Act
        manager.clearBranch(branchId);

        // Assert
        const result = manager.getTemplateNodeByBranch(branchId, 'test-oid');
        expect(result).toBeNull();
    });

    test('clear should remove all template nodes for all branches', () => {
        // Arrange
        const branch1 = 'branch-1';
        const branch2 = 'branch-2';
        const templateNode1 = createMockTemplateNode('oid-1', 'Component1');
        const templateNode2 = createMockTemplateNode('oid-2', 'Component2');
        
        manager['branchTemplateNodes'].set(branch1, new Map([['oid-1', templateNode1]]));
        manager['branchTemplateNodes'].set(branch2, new Map([['oid-2', templateNode2]]));

        // Act
        manager.clear();

        // Assert
        expect(manager.getTemplateNodeByBranch(branch1, 'oid-1')).toBeNull();
        expect(manager.getTemplateNodeByBranch(branch2, 'oid-2')).toBeNull();
        expect(manager['branchTemplateNodes'].size).toBe(0);
    });

    test('getCodeBlock should get template node and read file content', async () => {
        // Arrange
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        manager['branchTemplateNodes'].set('test-branch', new Map([['test-oid', templateNode]]));

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
        manager['branchTemplateNodes'].set('test-branch', new Map([['test-oid', templateNode]]));

        const getCodeBlockSpy = spyOn(manager, 'getCodeBlock').mockResolvedValue('code block content');

        // Act
        const result = await manager.getTemplateNodeChild('test-oid', childTemplateNode, 0);

        // Assert
        expect(getCodeBlockSpy).toHaveBeenCalledWith('test-oid');
        expect(result).toEqual({ instanceId: 'test-instance', component: 'TestComponent' });
    });
});