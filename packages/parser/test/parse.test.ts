import { describe, expect, test } from 'bun:test';
import { getAstFromContent, getContentFromAst } from 'src';

describe('Parse Tests', () => {
    test('should parse and serialize a simple component', async () => {
        const code = `export default function App() {\n  return (\n    <div>Hello, world!</div>);\n\n}`;
        const ast = getAstFromContent(code);
        const serialized = await getContentFromAst(ast);
        expect(serialized).toEqual(code);
    });
});
