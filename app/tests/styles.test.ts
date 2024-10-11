import { describe, expect, it } from 'bun:test';
import { generate, parse } from 'css-tree';
import { cssManager } from '../electron/preload/webview/style/index';

describe('CssStyleChange', () => {
    it('finding nodes by selector', () => {
        const ast = parse('.example { color: red } \n .example1 { color: blue }');
        const node1 = cssManager.find(ast, '.example')[0];
        const node2 = cssManager.find(ast, '.example1')[0];
        expect(generate(node1)).toBe('.example { color: red }'.replace(/\s/g, ''));
        expect(generate(node2)).toBe('.example1 { color: blue }'.replace(/\s/g, ''));
    });

    it('Add rule', () => {
        const ast = parse('');
        cssManager.addRule(ast, '.example', 'color', 'blue');
        expect(generate(ast)).toBe('.example { color: blue }'.replace(/\s/g, ''));
    });

    it('Update rule', () => {
        const ast = parse('.example { color: red }');
        const node = cssManager.find(ast, '.example')[0];
        cssManager.updateRule(node, 'color', 'blue');
        expect(generate(ast)).toBe('.example { color: blue }'.replace(/\s/g, ''));
    });
});
