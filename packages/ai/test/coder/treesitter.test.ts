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
        await expect(processor.parseNextCode(invalidCode)).rejects.toThrow();
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
        const astString = JSON.stringify(result);
        expect(astString).toContain('use server');
    });
});
