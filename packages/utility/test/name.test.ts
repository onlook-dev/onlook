import { describe, expect, it } from 'bun:test';
import { generateUniqueBranchName } from '../src/name';

describe('generateUniqueBranchName', () => {
    it('should return the base name if it does not exist', () => {
        const result = generateUniqueBranchName('main', ['feature-branch', 'develop']);
        expect(result).toBe('main');
    });

    it('should return main (1) when main exists', () => {
        const result = generateUniqueBranchName('main', ['main', 'feature-branch']);
        expect(result).toBe('main (1)');
    });

    it('should return main (2) when main and main (1) exist', () => {
        const result = generateUniqueBranchName('main', ['main', 'main (1)', 'feature-branch']);
        expect(result).toBe('main (2)');
    });

    it('should return main (3) when main, main (1), and main (2) exist', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            'main (2)',
            'feature-branch',
        ]);
        expect(result).toBe('main (3)');
    });

    it('should handle gaps in numbering correctly', () => {
        // If main (1) is deleted, next should be main (2), not main (1)
        const result = generateUniqueBranchName('main', ['main', 'main (2)', 'main (3)']);
        expect(result).toBe('main (1)');
    });

    it('should handle non-sequential numbers', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            'main (5)',
            'main (10)',
        ]);
        expect(result).toBe('main (2)');
    });

    it('should work with branch names containing special characters', () => {
        const result = generateUniqueBranchName('feature-ui-2.0', [
            'feature-ui-2.0',
            'other-branch',
        ]);
        expect(result).toBe('feature-ui-2.0 (1)');
    });

    it('should work with branch names containing parentheses', () => {
        const baseName = 'fix (urgent)';
        const result = generateUniqueBranchName(baseName, [baseName, 'other-branch']);
        expect(result).toBe('fix (urgent) (1)');
    });

    it('should work with branch names containing numbers', () => {
        const result = generateUniqueBranchName('v2.0', ['v2.0', 'v2.0 (1)', 'other-branch']);
        expect(result).toBe('v2.0 (2)');
    });

    it('should handle empty existing names array', () => {
        const result = generateUniqueBranchName('main', []);
        expect(result).toBe('main');
    });

    it('should handle very long branch names', () => {
        const longName = 'this-is-a-very-long-branch-name-with-many-characters-and-dashes';
        const result = generateUniqueBranchName(longName, [longName]);
        expect(result).toBe(`${longName} (1)`);
    });

    it('should find the next available number in a complex scenario', () => {
        // Scenario: main, main (1), main (3), main (5) exist
        // Should return main (2)
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            'main (3)',
            'main (5)',
            'other-branch',
            'feature-x',
        ]);
        expect(result).toBe('main (2)');
    });

    it('should ignore similarly named branches that do not match the pattern exactly', () => {
        // These should be ignored: 'main (1) copy', 'main-(1)', 'main (1)-branch'
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1) copy',
            'main-(1)',
            'main (1)-branch',
            'main-1',
        ]);
        expect(result).toBe('main (1)');
    });

    it('should handle branches with numbers that are not integers', () => {
        // These should be ignored: 'main (1.5)', 'main (01)', 'main (a)'
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1.5)',
            'main (01)',
            'main (a)',
            'main (2)',
        ]);
        expect(result).toBe('main (1)');
    });

    it('should handle cloning already numbered branches correctly', () => {
        // When cloning "main (1)", should become "main (2)" not "main (1) (1)"
        const result = generateUniqueBranchName('main (1)', ['main', 'main (1)', 'other-branch']);
        expect(result).toBe('main (2)');
    });

    it('should handle cloning numbered branches with gaps', () => {
        // When cloning "main (2)" with gaps, should find first available
        const result = generateUniqueBranchName('main (2)', [
            'main',
            'main (2)',
            'main (4)',
            'other-branch',
        ]);
        expect(result).toBe('main (1)');
    });

    it('should handle cloning the highest numbered branch', () => {
        // When cloning "main (3)", should become "main (4)"
        const result = generateUniqueBranchName('main (3)', [
            'main',
            'main (1)',
            'main (2)',
            'main (3)',
            'other-branch',
        ]);
        expect(result).toBe('main (4)');
    });

    it('should handle complex scenario with numbered branch being cloned', () => {
        // Scenario: clone "feature-x (2)" when feature-x, feature-x (1), feature-x (2), feature-x (4) exist
        // Should return feature-x (3)
        const result = generateUniqueBranchName('feature-x (2)', [
            'feature-x',
            'feature-x (1)',
            'feature-x (2)',
            'feature-x (4)',
            'other-branch',
        ]);
        expect(result).toBe('feature-x (3)');
    });

    // Edge Cases and Stress Tests
    it('should handle branch names that are just numbers', () => {
        const result = generateUniqueBranchName('123', ['123', '456']);
        expect(result).toBe('123 (1)');
    });

    it('should handle branch names with multiple spaces', () => {
        const result = generateUniqueBranchName('my  branch  name', ['my  branch  name']);
        expect(result).toBe('my  branch  name (1)');
    });

    it('should handle branch names ending with numbers (not in parentheses)', () => {
        const result = generateUniqueBranchName('version2', ['version2', 'version2 (1)']);
        expect(result).toBe('version2 (2)');
    });

    it('should handle branch names with regex special characters', () => {
        const result = generateUniqueBranchName('fix[bug].+*?', ['fix[bug].+*?']);
        expect(result).toBe('fix[bug].+*? (1)');
    });

    it('should handle very large numbers in sequence', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            'main (999)',
            'main (1000)',
            'main (1001)',
        ]);
        expect(result).toBe('main (2)');
    });

    it('should handle cloning a branch with very high number', () => {
        const result = generateUniqueBranchName('main (999)', [
            'main',
            'main (999)',
            'main (1001)',
        ]);
        // Should fill the gap at 1 (since we have main, main(999), main(1001) but no main(1))
        expect(result).toBe('main (1)');
    });

    it('should handle unsorted existing numbers correctly', () => {
        // Numbers provided out of order
        const result = generateUniqueBranchName('main', [
            'main (5)',
            'main',
            'main (2)',
            'main (1)',
            'main (4)',
        ]);
        expect(result).toBe('main (3)');
    });

    it('should handle duplicate numbers in existing names (should not happen but be defensive)', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            'main (1)', // duplicate
            'main (3)',
        ]);
        expect(result).toBe('main (2)');
    });

    it('should handle empty string as base name', () => {
        const result = generateUniqueBranchName('', ['', 'other']);
        expect(result).toBe(' (1)');
    });

    it('should handle single character branch names', () => {
        const result = generateUniqueBranchName('a', ['a', 'a (1)', 'b']);
        expect(result).toBe('a (2)');
    });

    it('should handle unicode characters in branch names', () => {
        const result = generateUniqueBranchName('功能-α', ['功能-α', '功能-β']);
        expect(result).toBe('功能-α (1)');
    });

    it('should handle branch names with emoji', () => {
        const result = generateUniqueBranchName('feature-🚀', ['feature-🚀']);
        expect(result).toBe('feature-🚀 (1)');
    });

    it('should handle nested parentheses correctly', () => {
        const result = generateUniqueBranchName('fix((urgent))', ['fix((urgent))']);
        expect(result).toBe('fix((urgent)) (1)');
    });

    it('should handle branch names that look like they have numbers but do not match pattern', () => {
        const result = generateUniqueBranchName('main (not-a-number)', ['main (not-a-number)']);
        expect(result).toBe('main (not-a-number) (1)');
    });

    it('should handle zero as a valid number', () => {
        const result = generateUniqueBranchName('main', ['main', 'main (0)', 'main (2)']);
        expect(result).toBe('main (1)');
    });

    it('should handle negative numbers (should be ignored)', () => {
        const result = generateUniqueBranchName('main', ['main', 'main (-1)', 'main (1)']);
        expect(result).toBe('main (2)');
    });

    it('should handle floating point numbers (should be ignored)', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1.0)',
            'main (1.5)',
            'main (2)',
        ]);
        expect(result).toBe('main (1)');
    });

    it('should handle scientific notation (should be ignored)', () => {
        const result = generateUniqueBranchName('main', ['main', 'main (1e2)', 'main (2)']);
        expect(result).toBe('main (1)');
    });

    it('should handle extremely long sequences efficiently', () => {
        const existingNames = ['main'];
        // Create a sequence with 100 branches: main (1) through main (100)
        for (let i = 1; i <= 100; i++) {
            existingNames.push(`main (${i})`);
        }

        const result = generateUniqueBranchName('main', existingNames);
        expect(result).toBe('main (101)');
    });

    it('should handle cloning in the middle of a large sequence', () => {
        const existingNames = ['main'];
        // Create a sequence but skip number 50
        for (let i = 1; i <= 100; i++) {
            if (i !== 50) {
                existingNames.push(`main (${i})`);
            }
        }

        const result = generateUniqueBranchName('main', existingNames);
        expect(result).toBe('main (50)');
    });

    it('should handle multiple gaps in sequence', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            // gap at 2
            'main (3)',
            // gap at 4
            'main (5)',
            'main (6)',
            // should fill first gap at 2
        ]);
        expect(result).toBe('main (2)');
    });

    it('should handle cloning branch that does not exist in the list', () => {
        const result = generateUniqueBranchName('nonexistent', ['main', 'feature']);
        expect(result).toBe('nonexistent');
    });

    it('should handle cloning numbered branch that does not exist', () => {
        const result = generateUniqueBranchName('nonexistent (5)', ['main', 'feature']);
        expect(result).toBe('nonexistent (5)');
    });

    it('should handle case sensitivity correctly', () => {
        const result = generateUniqueBranchName('Main', ['main', 'Main']);
        expect(result).toBe('Main (1)');
    });

    it('should handle whitespace variations', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (1)',
            'main( 1)',
            'main (1 )',
        ]);
        // Only 'main (1)' should match the pattern
        expect(result).toBe('main (2)');
    });

    // Performance and edge cases for the extractTrueBaseName function
    it('should correctly extract base name from deeply nested numbered names', () => {
        const result = generateUniqueBranchName('test (1) (2)', ['test (1) (2)']);
        // Should extract "test (1)" as base name and add (1) -> "test (1) (1)"
        expect(result).toBe('test (1) (1)');
    });

    it('should handle malformed numbered patterns', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main ()', // empty parentheses
            'main ( )', // space in parentheses
            'main (abc)', // non-numeric
            'main (1', // unclosed parentheses
        ]);
        expect(result).toBe('main (1)');
    });

    it('should handle very large numbers correctly', () => {
        const result = generateUniqueBranchName('main', [
            'main',
            'main (999999999999999)', // Very large number
        ]);
        expect(result).toBe('main (1)');
    });

    it('should handle cloning when only base name exists (regression test)', () => {
        // This was the original issue - ensure it still works
        const result = generateUniqueBranchName('main', ['main']);
        expect(result).toBe('main (1)');
    });

    it('should handle cloning when only numbered versions exist', () => {
        const result = generateUniqueBranchName('feature (1)', ['feature (1)', 'feature (3)']);
        expect(result).toBe('feature (2)');
    });

    it('should be deterministic with same inputs', () => {
        const input = ['main', 'main (1)', 'main (3)'];
        const result1 = generateUniqueBranchName('main', input);
        const result2 = generateUniqueBranchName('main', input);
        expect(result1).toBe(result2);
        expect(result1).toBe('main (2)');
    });
});
