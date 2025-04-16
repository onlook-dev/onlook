import { generateUniqueName } from '@onlook/utility';

describe('generateUniqueName', () => {
    it('should generate a unique name when no existing names', () => {
        const baseName = 'Primary';
        const existingNames: string[] = [];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary 1');
    });

    it('should generate a unique name when name exists', () => {
        const baseName = 'Primary';
        const existingNames = ['primary'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary 1');
    });

    it('should increment counter when multiple names exist', () => {
        const baseName = 'Primary';
        const existingNames = ['primary', 'primary1', 'primary2'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary 3');
    });

    it('should handle names with spaces', () => {
        const baseName = 'Primary Color';
        const existingNames = ['primaryColor'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary Color 1');
    });

    it('should handle special characters in base name', () => {
        const baseName = 'Primary-Color';
        const existingNames = ['primaryColor'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary-Color 1');
    });

    it('should handle empty base name', () => {
        const baseName = '';
        const existingNames: string[] = [];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe(' 1');
    });

    it('should work with custom transform function', () => {
        const baseName = 'Primary';
        const existingNames = ['PRIMARY'];
        const customTransform = (str: string) => str.toUpperCase();
        const result = generateUniqueName(baseName, existingNames, customTransform);
        expect(result).toBe('Primary 1');
    });

    it('should handle numeric base names', () => {
        const baseName = '100';
        const existingNames = ['100'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('100 1');
    });

    it('should handle mixed case existing names', () => {
        const baseName = 'Primary';
        const existingNames = ['PRIMARY', 'primary', 'Primary'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary 1');
    });

    it('should handle consecutive numbers in existing names', () => {
        const baseName = 'Primary';
        const existingNames = ['primary', 'primary1', 'primary3', 'primary4'];
        const result = generateUniqueName(baseName, existingNames);
        expect(result).toBe('Primary 2');
    });
});
