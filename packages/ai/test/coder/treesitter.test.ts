import { describe, expect, test } from 'bun:test';
import { TreeSitterProcessor } from '../../src/coder/treesitter';

describe('TreeSitterProcessor', () => {
    const processor = new TreeSitterProcessor();

    test('should parse simple Next.js component', async () => {
        const code = `
            export default function Page() {
                return <div>Hello World</div>;
            }
        `;
        const result = await processor.parseNextCode(code);
        expect(result).toBeDefined();
        expect(result.rootNode.type).toBe('program');

        const ast = await processor.getASTForLLM(code);
        expect(ast).toHaveProperty('children');
        const children = (ast as any).children;
        expect(
            children.some(
                (node: any) =>
                    node.type === 'export_statement' &&
                    node.text.includes('export default function'),
            ),
        ).toBe(true);
    });

    test('should transform AST for LLM consumption', async () => {
        const code = `
            'use client';
            export default function Button() {
                return <button>Click me</button>;
            }
        `;
        const result = await processor.getASTForLLM(code);
        expect(result).toHaveProperty('type', 'program');
        expect(result).toHaveProperty('children');
    });

    test('should handle parsing errors gracefully', async () => {
        const invalidCode = `
            export default function {
                syntax error here
            }
        `;
        const result = await processor.parseNextCode(invalidCode);
        expect(processor.hasParseErrors(result)).toBe(true);
    });

    test('should handle Next.js server components', async () => {
        const code = `
            'use server';
            async function submitForm(data: FormData) {
                'use server';
                return await processForm(data);
            }
            export default function Form() {
                return <form action={submitForm}>
                    <input type="text" />
                    <button type="submit">Submit</button>
                </form>;
            }
        `;
        const result = await processor.getASTForLLM(code, { parseServerComponents: true });
        expect(result).toHaveProperty('type', 'program');

        const findServerComponent = (node: any): boolean => {
            if (node.isServerComponent) return true;
            return node.children?.some((child: any) => findServerComponent(child)) || false;
        };

        expect(findServerComponent(result)).toBe(true);

        const ast = result as any;
        expect(
            ast.children.some(
                (node: any) =>
                    node.type === 'export_statement' &&
                    node.text.includes('export default function Form'),
            ),
        ).toBe(true);
    });

    test('should extract and serialize function signatures', async () => {
        const code = `
            'use client';
            export default function Button({ onClick }: { onClick: () => void }) {
                return <button onClick={onClick}>Click me</button>;
            }
            
            'use server';
            async function submitForm(data: FormData) {
                return await processForm(data);
            }
        `;

        const signatures = await processor.getFunctionSignatures(code, {
            parseServerComponents: true,
        });
        expect(signatures).toHaveLength(2);

        const [button, submit] = signatures;
        expect(button).toEqual({
            name: 'Button',
            type: 'client',
            params: [{ name: 'onClick', type: '() => void' }],
            modifiers: ['export', 'default'],
            returnType: 'JSX.Element',
        });

        expect(submit).toEqual({
            name: 'submitForm',
            type: 'server',
            async: true,
            params: [{ name: 'data', type: 'FormData' }],
            modifiers: [],
            returnType: 'Promise<void>',
        });

        const serialized = signatures.map((s) => processor.serializeFunction(s));
        expect(serialized[0]).toBe(
            '[client] [export, default] Button(onClick: () => void) -> JSX.Element',
        );
        expect(serialized[1]).toBe('[server] async submitForm(data: FormData) -> Promise<void>');
    });
});
