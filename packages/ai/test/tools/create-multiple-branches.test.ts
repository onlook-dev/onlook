import { CreateMultipleBranchesTool } from '@onlook/ai/src/tools/classes/create-multiple-branches';
import { describe, expect, test } from 'bun:test';

describe('CreateMultipleBranchesTool', () => {
    test('should have correct tool name and description', () => {
        expect(CreateMultipleBranchesTool.toolName).toBe('create_multiple_branches');
        expect(CreateMultipleBranchesTool.description).toContain('multiple duplicate branches');
    });

    test('should validate count parameter (1-5)', () => {
        const schema = CreateMultipleBranchesTool.parameters;
        
        // Valid counts
        expect(() => schema.parse({ count: 1 })).not.toThrow();
        expect(() => schema.parse({ count: 5 })).not.toThrow();
        expect(() => schema.parse({ count: 3 })).not.toThrow();
        
        // Invalid counts
        expect(() => schema.parse({ count: 0 })).toThrow();
        expect(() => schema.parse({ count: 6 })).toThrow();
        expect(() => schema.parse({ count: -1 })).toThrow();
    });

    test('should accept optional branchId', () => {
        const schema = CreateMultipleBranchesTool.parameters;
        
        // With branchId
        expect(() => schema.parse({ 
            count: 2, 
            branchId: '123e4567-e89b-12d3-a456-426614174000' 
        })).not.toThrow();
        
        // Without branchId (should use active branch)
        expect(() => schema.parse({ count: 2 })).not.toThrow();
    });

    test('should generate correct label', () => {
        expect(CreateMultipleBranchesTool.getLabel({ count: 1 })).toBe('Creating 1 branch');
        expect(CreateMultipleBranchesTool.getLabel({ count: 3 })).toBe('Creating 3 branches');
        expect(CreateMultipleBranchesTool.getLabel({ count: 5 })).toBe('Creating 5 branches');
        expect(CreateMultipleBranchesTool.getLabel()).toBe('Creating 1 branch'); // Default
    });

    test('should have Branch icon', () => {
        expect(CreateMultipleBranchesTool.icon).toBeDefined();
    });
});

