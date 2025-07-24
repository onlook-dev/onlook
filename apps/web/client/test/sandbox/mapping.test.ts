import type { TemplateNode, TemplateTag } from '@onlook/models';
import { CoreElementType } from '@onlook/models';
import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { TemplateNodeMapper } from '../../src/components/store/editor/sandbox/mapping';

// Mock the parser functions
mock.module('@onlook/parser', () => ({
    addOidsToAst: mock(() => ({ ast: {}, modified: true })),
    createTemplateNodeMap: mock(() => new Map()),
    getAstFromContent: mock(() => ({})),
    getContentFromAst: mock(async () => 'processed content'),
    injectPreloadScript: mock(() => {}),
}));

// Mock utility functions
mock.module('@onlook/utility/src/path', () => ({
    isTargetFile: mock(() => false),
}));

describe('TemplateNodeMapper', () => {
    let mapper: TemplateNodeMapper;

    beforeEach(() => {
        mapper = new TemplateNodeMapper();
    });

    const createMockTemplateNode = (id: string, name: string): TemplateNode => {
        const mockTemplateTag: TemplateTag = {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 10 },
        };

        return {
            path: 'test.tsx',
            startTag: mockTemplateTag,
            endTag: mockTemplateTag,
            component: name,
            dynamicType: null,
            coreElementType: CoreElementType.COMPONENT_ROOT,
        };
    };

    test('updateMapping should merge new mapping with existing one', () => {
        // Arrange
        const initialMap = new Map<string, TemplateNode>();
        initialMap.set('oid1', createMockTemplateNode('oid1', 'TestComponent'));

        const newMap = new Map<string, TemplateNode>();
        newMap.set('oid2', createMockTemplateNode('oid2', 'AnotherComponent'));

        // Act
        mapper.updateMapping(initialMap);
        mapper.updateMapping(newMap);

        // Assert
        const result = mapper.getTemplateNodeMap();
        expect(result.size).toBe(2);
        expect(result.has('oid1')).toBe(true);
        expect(result.has('oid2')).toBe(true);
    });

    test('getTemplateNode should return node for valid oid', () => {
        // Arrange
        const templateNode = createMockTemplateNode('test-oid', 'TestComponent');
        const nodeMap = new Map<string, TemplateNode>();
        nodeMap.set('test-oid', templateNode);
        mapper.updateMapping(nodeMap);

        // Act
        const result = mapper.getTemplateNode('test-oid');

        // Assert
        expect(result).toEqual(templateNode);
    });

    test('getTemplateNode should return null for invalid oid', () => {
        // Act
        const result = mapper.getTemplateNode('non-existent-oid');

        // Assert
        expect(result).toBeNull();
    });

    test('clear should remove all template nodes', () => {
        // Arrange
        const nodeMap = new Map<string, TemplateNode>();
        nodeMap.set('oid1', createMockTemplateNode('oid1', 'TestComponent'));
        mapper.updateMapping(nodeMap);

        // Act
        mapper.clear();

        // Assert
        expect(mapper.getTemplateNodeMap().size).toBe(0);
    });

    test('processFileForMapping should handle file content properly', async () => {
        // Arrange
        const filePath = 'test.tsx';
        const fileContent = '<div>Test content</div>';
        const updateMappingSpy = spyOn(mapper, 'updateMapping');

        // Act
        const result = await mapper.processFileForMapping(filePath, fileContent);

        // Assert
        expect(result).toHaveProperty('modified');
        expect(result).toHaveProperty('newContent');
        expect(typeof result.modified).toBe('boolean');
        expect(typeof result.newContent).toBe('string');
        expect(updateMappingSpy).toHaveBeenCalled();
    });

    test('processFileForMapping should return modified content', async () => {
        // Arrange
        const filePath = 'test.tsx';
        const fileContent = '<div>Original content</div>';

        // Act
        const result = await mapper.processFileForMapping(filePath, fileContent);

        // Assert
        expect(result.newContent).toBe('processed content');
        expect(result.modified).toBe(true);
    });
});
