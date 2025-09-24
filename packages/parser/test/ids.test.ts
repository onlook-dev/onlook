import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { addOidsToAst, getAstFromContent, getContentFromAst } from 'src';

const __dirname = import.meta.dir;

const OBFUSCATED_ID = 'REPLACED_OIDS';

const sanitizeOids = (content: string) => {
    return content.replace(/data-oid="[^"]*"/g, `data-oid="${OBFUSCATED_ID}"`);
};

describe('addOidsToAst', () => {
    const SHOULD_UPDATE_EXPECTED = false;
    const casesDir = path.resolve(__dirname, 'data/ids');

    const testCases = fs.readdirSync(casesDir);

    for (const testCase of testCases) {
        test(`should handle case: ${testCase}`, async () => {
            const caseDir = path.resolve(casesDir, testCase);
            const files = fs.readdirSync(caseDir);

            const inputFile = files.find((f) => f.startsWith('input.'));
            const expectedFile = files.find((f) => f.startsWith('expected.'));

            if (!inputFile || !expectedFile) {
                throw new Error(`Test case ${testCase} is missing input or expected file.`);
            }

            const inputPath = path.resolve(caseDir, inputFile);
            const expectedPath = path.resolve(caseDir, expectedFile);

            const inputContent = await Bun.file(inputPath).text();
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const { ast: astWithIds } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, inputContent);

            if (SHOULD_UPDATE_EXPECTED) {
                await Bun.write(expectedPath, result);
            }

            const expectedContent = await Bun.file(expectedPath).text();

            const sanitizedResult = sanitizeOids(result);
            const sanitizedExpected = sanitizeOids(expectedContent);

            expect(sanitizedResult).toBe(sanitizedExpected);
        });
    }

    describe('branch-aware OID handling', () => {
        test('should preserve existing OIDs from same branch', async () => {
            const inputContent = `<div data-oid="existing-oid">Content</div>`;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const globalOids = new Set(['existing-oid']);
            const branchOidMap = new Map([['existing-oid', 'branch-1']]);

            const { ast: astWithIds, modified } = addOidsToAst(
                ast,
                globalOids,
                branchOidMap,
                'branch-1',
            );

            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(false); // Should not modify same-branch OIDs
            expect(result).toContain('data-oid="existing-oid"'); // Should preserve original OID
        });

        test('should replace OIDs that conflict with different branches', async () => {
            const inputContent = `<div data-oid="conflicting-oid">Content</div>`;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const globalOids = new Set(['conflicting-oid']);
            const branchOidMap = new Map([['conflicting-oid', 'other-branch']]);

            const { ast: astWithIds, modified } = addOidsToAst(
                ast,
                globalOids,
                branchOidMap,
                'current-branch',
            );

            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true); // Should modify conflicting OIDs
            expect(result).not.toContain('data-oid="conflicting-oid"'); // Should replace with new OID
            expect(result).toMatch(/data-oid="[a-z0-9\-\._:]{7}"/); // Should have new OID with expected format
        });

        test('should add OIDs to elements without them and ensure uniqueness', async () => {
            const inputContent = `<div>Content without OID</div>`;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const globalOids = new Set(['existing-oid']);
            const branchOidMap = new Map([['existing-oid', 'other-branch']]);

            const { ast: astWithIds, modified } = addOidsToAst(
                ast,
                globalOids,
                branchOidMap,
                'current-branch',
            );

            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true); // Should add new OID
            expect(result).toMatch(/data-oid="[a-z0-9\-\._:]{7}"/); // Should have new OID
            expect(result).not.toContain('data-oid="existing-oid"'); // Should not conflict with existing
        });

        test('should ensure OIDs are unique within the same AST', async () => {
            const inputContent = `
                <div>
                    <div data-oid="duplicate-oid">First</div>
                    <span data-oid="duplicate-oid">Second</span>
                    <p>Third without OID</p>
                </div>
            `;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const globalOids = new Set<string>();
            const branchOidMap = new Map<string, string>();

            const { ast: astWithIds, modified } = addOidsToAst(
                ast,
                globalOids,
                branchOidMap,
                'current-branch',
            );

            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true); // Should modify to fix duplicate and add missing OID

            // Extract all OIDs from the result
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(4); // Should have 4 OIDs total (wrapper + 3 children)

            // Extract just the OID values
            const oidValues =
                oidMatches?.map((match) => match.match(/data-oid="([^"]*)"/)?.[1]) || [];
            const uniqueOids = new Set(oidValues);

            expect(uniqueOids.size).toBe(4); // All OIDs should be unique

            // Check that "duplicate-oid" appears exactly once (first occurrence is kept)
            const duplicateOidCount = oidValues.filter((oid) => oid === 'duplicate-oid').length;
            expect(duplicateOidCount).toBe(1);

            // Check that all other OIDs have the expected 7-character format (or are the preserved duplicate)
            expect(
                oidValues.every((oid) => oid && (oid.length === 7 || oid === 'duplicate-oid')),
            ).toBe(true);
        });

        test('should handle multiple elements without OIDs and ensure all are unique', async () => {
            const inputContent = `
                <div>
                    <div>First</div>
                    <span>Second</span>
                    <p>Third</p>
                    <section>Fourth</section>
                </div>
            `;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const globalOids = new Set(['existing-1', 'existing-2']);
            const branchOidMap = new Map();

            const { ast: astWithIds, modified } = addOidsToAst(
                ast,
                globalOids,
                branchOidMap,
                'current-branch',
            );

            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true); // Should add OIDs to all elements

            // Extract all OIDs from the result
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(5); // Should have 5 OIDs total (wrapper + 4 children)

            // Extract just the OID values
            const oidValues =
                oidMatches?.map((match) => match.match(/data-oid="([^"]*)"/)?.[1]) || [];
            const uniqueOids = new Set(oidValues);

            expect(uniqueOids.size).toBe(5); // All OIDs should be unique
            expect(
                oidValues.every((oid) => oid && !['existing-1', 'existing-2'].includes(oid)),
            ).toBe(true); // Should not conflict with global OIDs
        });
    });

    describe('invalid data oid handling', () => {
        test('should remove and replace non-string data oid attributes', async () => {
            // Create a mock AST with a non-string data oid value
            const ast = getAstFromContent('<div>Content</div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Manually modify the AST to have a non-string oid value (simulating invalid state)
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const openingElement = statement.expression.openingElement;
                    // Add an invalid oid attribute with a non-string value
                    const invalidOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: {
                            type: 'JSXExpressionContainer',
                            expression: {
                                type: 'Literal',
                                value: 123,
                                raw: '123',
                            },
                        },
                    };
                    openingElement.attributes.push(invalidOidAttr as any);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div>Content</div>');

            expect(modified).toBe(true); // Should modify to fix invalid oid
            expect(result).toMatch(/data-oid="[a-z0-9\-\._:]{7}"/); // Should have valid string OID
            expect(result).not.toContain('data-oid={123}'); // Should not contain invalid expression
        });

        test('should handle null or undefined data oid values', async () => {
            const ast = getAstFromContent('<div>Content</div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Manually modify the AST to have a null oid value
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const openingElement = statement.expression.openingElement;
                    const invalidOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: null,
                    };
                    openingElement.attributes.push(invalidOidAttr as any);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div>Content</div>');

            expect(modified).toBe(true); // Should modify to fix invalid oid
            expect(result).toMatch(/data-oid="[a-z0-9\-\._:]{7}"/); // Should have valid string OID
        });

        test('should handle JSX expression container with non-string values', async () => {
            const ast = getAstFromContent('<div>Content</div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Manually modify the AST to have an expression container with boolean value
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const openingElement = statement.expression.openingElement;
                    const invalidOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: {
                            type: 'JSXExpressionContainer',
                            expression: {
                                type: 'Literal',
                                value: true,
                                raw: 'true',
                            },
                        },
                    };
                    openingElement.attributes.push(invalidOidAttr as any);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div>Content</div>');

            expect(modified).toBe(true); // Should modify to fix invalid oid
            expect(result).toMatch(/data-oid="[a-z0-9\-\._:]{7}"/); // Should have valid string OID
            expect(result).not.toContain('data-oid={true}'); // Should not contain invalid expression
        });

        test('should preserve valid string oids and only replace invalid ones in mixed scenarios', async () => {
            const inputContent = `
                <div>
                    <div data-oid="valid-oid">Valid</div>
                    <span>No OID</span>
                </div>
            `;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            // Add an invalid oid to one of the elements
            let elementCount = 0;
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const traverse = (node: any) => {
                        if (node.type === 'JSXElement') {
                            if (elementCount === 2) { // Third element (span)
                                const invalidOidAttr = {
                                    type: 'JSXAttribute',
                                    name: {
                                        type: 'JSXIdentifier',
                                        name: 'data-oid',
                                    },
                                    value: {
                                        type: 'JSXExpressionContainer',
                                        expression: {
                                            type: 'Literal',
                                            value: 456,
                                            raw: '456',
                                        },
                                    },
                                };
                                node.openingElement.attributes.push(invalidOidAttr);
                            }
                            elementCount++;

                            if (node.children) {
                                node.children.forEach(traverse);
                            }
                        }
                    };
                    traverse(statement.expression);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true); // Should modify to add missing OIDs and fix invalid ones
            expect(result).toContain('data-oid="valid-oid"'); // Should preserve valid OID
            expect(result).not.toContain('data-oid={456}'); // Should not contain invalid expression

            // Should have 3 elements total with valid string OIDs
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(3);

            const oidValues = oidMatches?.map((match) => match.match(/data-oid="([^"]*)"/)?.[1]) || [];
            expect(oidValues.every(oid => typeof oid === 'string' && oid.length > 0)).toBe(true);
        });

        test('should ensure uniqueness when replacing invalid oids', async () => {
            const ast = getAstFromContent('<div><span>First</span><p>Second</p></div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Add invalid oids to both child elements
            let elementCount = 0;
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const traverse = (node: any) => {
                        if (node.type === 'JSXElement') {
                            if (elementCount === 1 || elementCount === 2) { // Child elements
                                const invalidOidAttr = {
                                    type: 'JSXAttribute',
                                    name: {
                                        type: 'JSXIdentifier',
                                        name: 'data-oid',
                                    },
                                    value: {
                                        type: 'JSXExpressionContainer',
                                        expression: {
                                            type: 'Literal',
                                            value: 999,
                                            raw: '999',
                                        },
                                    },
                                };
                                node.openingElement.attributes.push(invalidOidAttr);
                            }
                            elementCount++;

                            if (node.children) {
                                node.children.forEach(traverse);
                            }
                        }
                    };
                    traverse(statement.expression);
                }
            });

            const globalOids = new Set(['existing-oid']);
            const { ast: astWithIds, modified } = addOidsToAst(ast, globalOids);
            const result = await getContentFromAst(astWithIds, '<div><span>First</span><p>Second</p></div>');

            expect(modified).toBe(true); // Should modify to fix invalid oids and add missing ones

            // Extract all OIDs from the result
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(3); // Should have 3 OIDs total (wrapper + 2 children)

            // Extract just the OID values
            const oidValues = oidMatches?.map((match) => match.match(/data-oid="([^"]*)"/)?.[1]) || [];
            const uniqueOids = new Set(oidValues);

            expect(uniqueOids.size).toBe(3); // All OIDs should be unique
            expect(oidValues.every((oid) => oid && !globalOids.has(oid))).toBe(true); // Should not conflict with global OIDs
            expect(result).not.toContain('data-oid={999}'); // Should not contain invalid expressions
        });

        test('should remove all multiple oid attributes and create a single new one', async () => {
            const ast = getAstFromContent('<div>Content</div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Manually add multiple oid attributes to the same element
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const openingElement = statement.expression.openingElement;
                    
                    // Add first valid oid
                    const firstOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: {
                            type: 'StringLiteral',
                            value: 'first-oid',
                        },
                    };
                    
                    // Add second valid oid
                    const secondOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: {
                            type: 'StringLiteral',
                            value: 'second-oid',
                        },
                    };

                    openingElement.attributes.push(firstOidAttr as any, secondOidAttr as any);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div>Content</div>');

            expect(modified).toBe(true); // Should modify to remove duplicates
            expect(result).not.toContain('data-oid="first-oid"'); // Should not contain original oids
            expect(result).not.toContain('data-oid="second-oid"'); // Should not contain original oids
            
            // Should have exactly one oid attribute
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(1);
            
            // Should have a new valid 7-character OID
            const oidValue = oidMatches?.[0]?.match(/data-oid="([^"]*)"/)?.[1];
            expect(oidValue).toBeDefined();
            expect(oidValue?.length).toBe(7);
        });

        test('should handle mix of valid and invalid multiple oids', async () => {
            const ast = getAstFromContent('<div>Content</div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Add multiple oid attributes with mix of valid and invalid values
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const openingElement = statement.expression.openingElement;
                    
                    // Add valid string oid
                    const validOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: {
                            type: 'StringLiteral',
                            value: 'valid-oid',
                        },
                    };
                    
                    // Add invalid numeric oid
                    const invalidOidAttr = {
                        type: 'JSXAttribute',
                        name: {
                            type: 'JSXIdentifier',
                            name: 'data-oid',
                        },
                        value: {
                            type: 'JSXExpressionContainer',
                            expression: {
                                type: 'Literal',
                                value: 123,
                                raw: '123',
                            },
                        },
                    };

                    openingElement.attributes.push(validOidAttr as any, invalidOidAttr as any);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div>Content</div>');

            expect(modified).toBe(true); // Should modify to remove all and create new
            expect(result).not.toContain('data-oid="valid-oid"'); // Should not contain original valid oid
            expect(result).not.toContain('data-oid={123}'); // Should not contain invalid expression
            
            // Should have exactly one oid attribute
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(1);
            
            // Should have a new valid OID
            const oidValue = oidMatches?.[0]?.match(/data-oid="([^"]*)"/)?.[1];
            expect(oidValue).toBeDefined();
            expect(typeof oidValue).toBe('string');
            expect(oidValue?.length).toBe(7);
        });

        test('should handle multiple elements each with multiple oids', async () => {
            const ast = getAstFromContent('<div><span>First</span><p>Second</p></div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Add multiple oids to each child element
            let elementCount = 0;
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const traverse = (node: any) => {
                        if (node.type === 'JSXElement') {
                            if (elementCount === 1) { // First child (span)
                                const oid1 = {
                                    type: 'JSXAttribute',
                                    name: { type: 'JSXIdentifier', name: 'data-oid' },
                                    value: { type: 'StringLiteral', value: 'span-oid-1' },
                                };
                                const oid2 = {
                                    type: 'JSXAttribute',
                                    name: { type: 'JSXIdentifier', name: 'data-oid' },
                                    value: { type: 'StringLiteral', value: 'span-oid-2' },
                                };
                                node.openingElement.attributes.push(oid1, oid2);
                            } else if (elementCount === 2) { // Second child (p)
                                const oid1 = {
                                    type: 'JSXAttribute',
                                    name: { type: 'JSXIdentifier', name: 'data-oid' },
                                    value: { type: 'StringLiteral', value: 'p-oid-1' },
                                };
                                const oid2 = {
                                    type: 'JSXAttribute',
                                    name: { type: 'JSXIdentifier', name: 'data-oid' },
                                    value: { type: 'StringLiteral', value: 'p-oid-2' },
                                };
                                node.openingElement.attributes.push(oid1, oid2);
                            }
                            elementCount++;
                            
                            if (node.children) {
                                node.children.forEach(traverse);
                            }
                        }
                    };
                    traverse(statement.expression);
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div><span>First</span><p>Second</p></div>');

            expect(modified).toBe(true); // Should modify all elements

            // Should not contain any of the original oids
            expect(result).not.toContain('span-oid-1');
            expect(result).not.toContain('span-oid-2');
            expect(result).not.toContain('p-oid-1');
            expect(result).not.toContain('p-oid-2');
            
            // Should have exactly 3 oid attributes (wrapper + 2 children)
            const oidMatches = result.match(/data-oid="([^"]*)"/g);
            expect(oidMatches).toHaveLength(3);
            
            // All oids should be unique
            const oidValues = oidMatches?.map((match) => match.match(/data-oid="([^"]*)"/)?.[1]) || [];
            const uniqueOids = new Set(oidValues);
            expect(uniqueOids.size).toBe(3);
            
            // All oids should be valid 7-character strings
            expect(oidValues.every(oid => oid && oid.length === 7)).toBe(true);
        });

        test('should actually remove multiple oids from the generated code', async () => {
            // Start with code that has multiple data-oid attributes
            const inputContent = `<div data-oid="first-oid" data-oid="second-oid">Content</div>`;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true);
            
            // Verify the original duplicate oids are completely gone
            expect(result).not.toContain('data-oid="first-oid"');
            expect(result).not.toContain('data-oid="second-oid"');
            
            // Should have exactly one data-oid attribute
            const oidCount = (result.match(/data-oid=/g) || []).length;
            expect(oidCount).toBe(1);
            
            // Verify it has a new valid oid
            const oidMatch = result.match(/data-oid="([^"]*)"/);
            expect(oidMatch).not.toBeNull();
            expect(oidMatch![1]).toHaveLength(7);
        });

        test('should remove multiple oids but preserve single valid oids', async () => {
            const inputContent = `
                <div data-oid="div1" data-oid="div2">
                    <span data-oid="span1" data-oid="span2" data-oid="span3">Text</span>
                    <p data-oid="p1">Paragraph</p>
                </div>
            `;
            const ast = getAstFromContent(inputContent);
            if (!ast) throw new Error('Failed to parse input code');

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, inputContent);

            expect(modified).toBe(true);
            
            // Multiple oids should be removed and replaced
            expect(result).not.toContain('data-oid="div1"');
            expect(result).not.toContain('data-oid="div2"');
            expect(result).not.toContain('data-oid="span1"');
            expect(result).not.toContain('data-oid="span2"');
            expect(result).not.toContain('data-oid="span3"');
            
            // Single valid oid should be preserved (no conflicts in this test)
            expect(result).toContain('data-oid="p1"');
            
            // Should have exactly 3 data-oid attributes (one per element)
            const oidCount = (result.match(/data-oid=/g) || []).length;
            expect(oidCount).toBe(3);
        });

        test('should handle combination of non-string and multiple oids', async () => {
            const ast = getAstFromContent('<div>Content</div>');
            if (!ast) throw new Error('Failed to parse input code');

            // Manually add multiple oid attributes with mix of valid strings and invalid types
            ast.program.body.forEach((statement) => {
                if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXElement') {
                    const openingElement = statement.expression.openingElement;
                    
                    // Add first valid string oid
                    const validOid1 = {
                        type: 'JSXAttribute',
                        name: { type: 'JSXIdentifier', name: 'data-oid' },
                        value: { type: 'StringLiteral', value: 'valid-string-1' },
                    };
                    
                    // Add invalid numeric oid
                    const invalidNumericOid = {
                        type: 'JSXAttribute',
                        name: { type: 'JSXIdentifier', name: 'data-oid' },
                        value: {
                            type: 'JSXExpressionContainer',
                            expression: { type: 'Literal', value: 456, raw: '456' },
                        },
                    };
                    
                    // Add second valid string oid
                    const validOid2 = {
                        type: 'JSXAttribute',
                        name: { type: 'JSXIdentifier', name: 'data-oid' },
                        value: { type: 'StringLiteral', value: 'valid-string-2' },
                    };
                    
                    // Add invalid boolean oid
                    const invalidBooleanOid = {
                        type: 'JSXAttribute',
                        name: { type: 'JSXIdentifier', name: 'data-oid' },
                        value: {
                            type: 'JSXExpressionContainer',
                            expression: { type: 'Literal', value: true, raw: 'true' },
                        },
                    };

                    openingElement.attributes.push(
                        validOid1 as any,
                        invalidNumericOid as any, 
                        validOid2 as any,
                        invalidBooleanOid as any
                    );
                }
            });

            const { ast: astWithIds, modified } = addOidsToAst(ast);
            const result = await getContentFromAst(astWithIds, '<div>Content</div>');

            expect(modified).toBe(true);
            
            // All original oids (both valid and invalid) should be removed
            expect(result).not.toContain('data-oid="valid-string-1"');
            expect(result).not.toContain('data-oid="valid-string-2"');
            expect(result).not.toContain('data-oid={456}');
            expect(result).not.toContain('data-oid={true}');
            
            // Should have exactly one data-oid attribute
            const oidCount = (result.match(/data-oid=/g) || []).length;
            expect(oidCount).toBe(1);
            
            // Should be a new valid 7-character string oid
            const oidMatch = result.match(/data-oid="([^"]*)"/);
            expect(oidMatch).not.toBeNull();
            expect(oidMatch![1]).toHaveLength(7);
            expect(typeof oidMatch![1]).toBe('string');
        });
    });
});
