import { toNormalCase, toCamelCase } from '@onlook/utility';

describe('toNormalCase', () => {
    it('should handle empty string', () => {
        expect(toNormalCase('')).toBe('');
    });

    it('should handle null or undefined', () => {
        expect(toNormalCase(null as any)).toBe('');
        expect(toNormalCase(undefined as any)).toBe('');
    });

    it('should convert camelCase to normal case', () => {
        expect(toNormalCase('camelCase')).toBe('Camel Case');
        expect(toNormalCase('thisIsATest')).toBe('This Is A Test');
    });

    it('should convert PascalCase to normal case', () => {
        expect(toNormalCase('PascalCase')).toBe('Pascal Case');
        expect(toNormalCase('ThisIsATest')).toBe('This Is A Test');
    });

    it('should handle single word', () => {
        expect(toNormalCase('test')).toBe('Test');
        expect(toNormalCase('Test')).toBe('Test');
    });

    it('should handle already normal case', () => {
        expect(toNormalCase('Normal Case')).toBe('Normal Case');
    });

    it('should handle mixed case', () => {
        expect(toNormalCase('mixedCaseWithPascal')).toBe('Mixed Case With Pascal');
    });
});

describe('toCamelCase', () => {
    it('should handle empty string', () => {
        expect(toCamelCase('')).toBe('');
    });

    it('should handle null or undefined', () => {
        expect(toCamelCase(null as any)).toBe('');
        expect(toCamelCase(undefined as any)).toBe('');
    });

    it('should convert normal case to camelCase', () => {
        expect(toCamelCase('normal case')).toBe('normalCase');
        expect(toCamelCase('this is a test')).toBe('thisIsATest');
    });

    it('should convert PascalCase to camelCase', () => {
        expect(toCamelCase('PascalCase')).toBe('pascalCase');
        expect(toCamelCase('ThisIsATest')).toBe('thisIsATest');
    });

    it('should handle single word', () => {
        expect(toCamelCase('test')).toBe('test');
        expect(toCamelCase('Test')).toBe('test');
    });

    it('should handle already camelCase', () => {
        expect(toCamelCase('camelCase')).toBe('camelCase');
    });

    it('should handle mixed separators', () => {
        expect(toCamelCase('mixed-case_with spaces')).toBe('mixedCaseWithSpaces');
        expect(toCamelCase('mixed_case-with spaces')).toBe('mixedCaseWithSpaces');
    });

    it('should handle numbers', () => {
        expect(toCamelCase('test 123')).toBe('test123');
        expect(toCamelCase('123 test')).toBe('123Test');
    });

    it('should handle multiple consecutive separators', () => {
        expect(toCamelCase('test--case')).toBe('testCase');
        expect(toCamelCase('test__case')).toBe('testCase');
        expect(toCamelCase('test  case')).toBe('testCase');
    });
});
