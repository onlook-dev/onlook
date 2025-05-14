import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { CoreElementType, DynamicType } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { getAstFromContent } from 'src';
import { traverse } from 'src/packages';
import {
    createTemplateNodeMap,
    getCoreElementInfo,
    getDynamicTypeInfo,
    isNodeElementArray,
} from 'src/template-node/map';

describe('Template Tests', () => {
    describe('createTemplateNodeMap', () => {
        test('should create mapping for simple component', () => {
            const code = `
                function App() {
                    return <div data-oid="test-id">Hello</div>;
                }
            `;
            const ast = getAstFromContent(code);
            const mapping = createTemplateNodeMap(ast, 'test.tsx');

            expect(mapping?.get('test-id')).toBeDefined();
            expect(mapping?.get('test-id')?.component).toBe('App');
            expect(mapping?.get('test-id')?.path).toBe('test.tsx');
        });

        test('should handle nested components', () => {
            const code = `
                function Child() {
                    return <div data-oid="child-id">Child</div>;
                }
                function Parent() {
                    return <div data-oid="parent-id"><Child /></div>;
                }
            `;
            const ast = getAstFromContent(code);
            const mapping = createTemplateNodeMap(ast, 'test.tsx');

            expect(mapping?.get('child-id')?.component).toBe('Child');
            expect(mapping?.get('parent-id')?.component).toBe('Parent');
        });

        test('should handle dynamic array elements', () => {
            const code = `
                function List() {
                    return (
                        <div>
                            {items.map(item => (
                                <div data-oid="list-item">Item</div>
                            ))}
                        </div>
                    );
                }
            `;
            const ast = getAstFromContent(code);
            const mapping = createTemplateNodeMap(ast, 'test.tsx');

            expect(mapping?.get('list-item')?.dynamicType).toBe(DynamicType.ARRAY);
        });

        test('should handle conditional elements', () => {
            const code = `
                function Conditional() {
                    return (
                        <div>
                            {condition ? <div data-oid="cond-id">True</div> : null}
                        </div>
                    );
                }
            `;
            const ast = getAstFromContent(code);
            const mapping = createTemplateNodeMap(ast, 'test.tsx');

            expect(mapping?.get('cond-id')?.dynamicType).toBe(DynamicType.CONDITIONAL);
        });
    });

    describe('isNodeElementArray', () => {
        test('should identify array map calls', () => {
            const mapCall = t.callExpression(
                t.memberExpression(t.identifier('items'), t.identifier('map')),
                [],
            );

            expect(isNodeElementArray(mapCall)).toBe(true);
        });

        test('should return false for non-map calls', () => {
            const nonMapCall = t.callExpression(
                t.memberExpression(t.identifier('items'), t.identifier('filter')),
                [],
            );

            expect(isNodeElementArray(nonMapCall)).toBe(false);
        });
    });

    describe('getCoreElementInfo', () => {
        test('should identify component root elements', () => {
            const code = `
                function App() {
                    return <div data-oid="root">Root</div>;
                }
            `;
            const ast = getAstFromContent(code);
            let rootElement: NodePath<t.JSXElement> | undefined;

            // Find the JSX element in the AST
            traverse(ast, {
                JSXElement(path) {
                    rootElement = path;
                },
            });

            expect(rootElement && getCoreElementInfo(rootElement)).toBe(
                CoreElementType.COMPONENT_ROOT,
            );
        });

        test('should identify body tags', () => {
            const code = `
                function App() {
                    return <html><body data-oid="body">Content</body></html>;
                }
            `;
            const ast = getAstFromContent(code);
            let bodyElement: NodePath<t.JSXElement> | undefined;

            traverse(ast, {
                JSXElement(path) {
                    if (
                        t.isJSXIdentifier(path.node.openingElement.name) &&
                        path.node.openingElement.name.name === 'body'
                    ) {
                        bodyElement = path;
                    }
                },
            });

            expect(bodyElement && getCoreElementInfo(bodyElement)).toBe(CoreElementType.BODY_TAG);
        });
    });

    describe('getDynamicTypeInfo', () => {
        test('should identify conditional elements', () => {
            const code = `
                function App() {
                    return <div>{condition ? <div data-oid="cond">Test</div> : null}</div>;
                }
            `;
            const ast = getAstFromContent(code);
            let conditionalElement: NodePath<t.JSXElement> | undefined;

            traverse(ast, {
                JSXElement(path) {
                    if (
                        path.node.openingElement.attributes.some(
                            (attr) => t.isJSXAttribute(attr) && attr.name.name === 'data-oid',
                        )
                    ) {
                        conditionalElement = path;
                    }
                },
            });

            expect(conditionalElement && getDynamicTypeInfo(conditionalElement)).toBe(
                DynamicType.CONDITIONAL,
            );
        });

        test('should identify array elements', () => {
            const code = `
                function App() {
                    return <div>{items.map(item => <div data-oid="item">Test</div>)}</div>;
                }
            `;
            const ast = getAstFromContent(code);
            let arrayElement: NodePath<t.JSXElement> | undefined;

            traverse(ast, {
                JSXElement(path) {
                    if (
                        path.node.openingElement.attributes.some(
                            (attr) => t.isJSXAttribute(attr) && attr.name.name === 'data-oid',
                        )
                    ) {
                        arrayElement = path;
                    }
                },
            });

            expect(arrayElement && getDynamicTypeInfo(arrayElement)).toBe(DynamicType.ARRAY);
        });
    });
});
