import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/constants';
import { describe, expect, test } from 'bun:test';
import { addOidsToAst, getAstFromContent, getContentFromAst, getExistingOid } from 'src';

describe('addIdsToAst Tests', () => {
    test('should add ids to jsx', async () => {
        const code = `export default function App() {\n  return (\n    <div>Hello, world!</div>);\n\n}`;
        const ast = getAstFromContent(code);
        const { ast: astWithIds, modified } = addOidsToAst(ast);
        const serialized = await getContentFromAst(astWithIds);
        expect(serialized).toEqual(
            expect.stringMatching(
                /export default function App\(\) {\n\s+return \(\n\s+<div data-oid=".+">Hello, world!<\/div>\);\n\n}/,
            ),
        );
        expect(modified).toBe(true);
    });

    test('should not add ids to jsx if they already exist', async () => {
        const code = `export default function App() {\n  return (\n    <div data-oid="1">Hello, world!</div>);\n\n}`;
        const ast = getAstFromContent(code);
        const { ast: astWithIds, modified } = addOidsToAst(ast);
        const serialized = await getContentFromAst(astWithIds);
        expect(serialized).toEqual(code);
        expect(modified).toBe(false);
    });
});

describe('getExistingOid Tests', () => {
    test('should return null when no attributes exist', () => {
        const attributes: t.JSXAttribute[] = [];
        expect(getExistingOid(attributes)).toBeNull();
    });

    test('should return null when data-oid attribute does not exist', () => {
        const attributes = [t.jsxAttribute(t.jsxIdentifier('class'), t.stringLiteral('test'))];
        expect(getExistingOid(attributes)).toBeNull();
    });

    test('should return value and index when data-oid exists', () => {
        const oidValue = 'test-id';
        const attributes = [
            t.jsxAttribute(t.jsxIdentifier('class'), t.stringLiteral('test')),
            t.jsxAttribute(
                t.jsxIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                t.stringLiteral(oidValue),
            ),
        ];

        const result = getExistingOid(attributes);
        expect(result).toEqual({
            value: oidValue,
            index: 1,
        });
    });

    test('should return null for spread attributes', () => {
        const attributes = [
            t.jsxSpreadAttribute(t.identifier('props')),
            t.jsxAttribute(
                t.jsxIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                t.stringLiteral('test-id'),
            ),
        ];
        expect(getExistingOid(attributes)).toEqual({
            value: 'test-id',
            index: 1,
        });
    });

    test('should return null when data-oid value is not a string literal', () => {
        const attributes = [
            t.jsxAttribute(
                t.jsxIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                t.jsxExpressionContainer(t.identifier('id')),
            ),
        ];
        expect(getExistingOid(attributes)).toBeNull();
    });

    test('should return null when data-oid value is null', () => {
        const attribute = t.jsxAttribute(t.jsxIdentifier(EditorAttributes.DATA_ONLOOK_ID), null);
        expect(getExistingOid([attribute])).toBeNull();
    });

    test('should find data-oid at any position in attributes array', () => {
        const oidValue = 'middle-id';
        const attributes = [
            t.jsxAttribute(t.jsxIdentifier('class'), t.stringLiteral('first')),
            t.jsxAttribute(
                t.jsxIdentifier(EditorAttributes.DATA_ONLOOK_ID),
                t.stringLiteral(oidValue),
            ),
            t.jsxAttribute(t.jsxIdentifier('style'), t.stringLiteral('last')),
        ];

        const result = getExistingOid(attributes);
        expect(result).toEqual({
            value: oidValue,
            index: 1,
        });
    });
});
