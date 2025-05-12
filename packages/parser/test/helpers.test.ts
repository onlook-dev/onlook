import * as t from '@babel/types';
import { describe, expect, test } from 'bun:test';
import { isReactFragment } from 'src';

describe('Helper Tests', () => {
    test('should correctly identify React.Fragment', () => {
        // Create a React.Fragment JSX element manually
        const fragmentElement = t.jsxOpeningElement(
            t.jsxMemberExpression(t.jsxIdentifier('React'), t.jsxIdentifier('Fragment')),
            [],
            true,
        );
        expect(isReactFragment(fragmentElement)).toBe(true);
    });

    test('should correctly identify shorthand Fragment (<>)', () => {
        // Create a Fragment JSX element manually
        const fragmentElement = t.jsxOpeningElement(t.jsxIdentifier('Fragment'), [], true);
        expect(isReactFragment(fragmentElement)).toBe(true);
    });

    test('should return false for non-Fragment elements', () => {
        // Create a regular div JSX element
        const divElement = t.jsxOpeningElement(t.jsxIdentifier('div'), [], false);
        expect(isReactFragment(divElement)).toBe(false);
    });
});
