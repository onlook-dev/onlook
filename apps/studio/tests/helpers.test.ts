import { toNormalCase } from '@onlook/utility';
import { camelCase } from 'lodash';

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

describe('camelCase', () => {
    it('should handle empty string', () => {
        expect(camelCase('')).toBe('');
    });

    it('should handle null or undefined', () => {
        expect(camelCase(null as any)).toBe('');
        expect(camelCase(undefined as any)).toBe('');
    });

    it('should convert normal case to camelCase', () => {
        expect(camelCase('normal case')).toBe('normalCase');
        expect(camelCase('this is a test')).toBe('thisIsATest');
    });

    it('should convert PascalCase to camelCase', () => {
        expect(camelCase('PascalCase')).toBe('pascalCase');
        expect(camelCase('ThisIsATest')).toBe('thisIsATest');
    });

    it('should handle single word', () => {
        expect(camelCase('test')).toBe('test');
        expect(camelCase('Test')).toBe('test');
    });

    it('should handle already camelCase', () => {
        expect(camelCase('camelCase')).toBe('camelCase');
    });

    it('should handle mixed separators', () => {
        expect(camelCase('mixed-case_with spaces')).toBe('mixedCaseWithSpaces');
        expect(camelCase('mixed_case-with spaces')).toBe('mixedCaseWithSpaces');
    });

    it('should handle numbers', () => {
        expect(camelCase('test 123')).toBe('test123');
        expect(camelCase('123 test')).toBe('123Test');
    });

    it('should handle multiple consecutive separators', () => {
        expect(camelCase('test--case')).toBe('testCase');
        expect(camelCase('test__case')).toBe('testCase');
        expect(camelCase('test  case')).toBe('testCase');
    });
});
