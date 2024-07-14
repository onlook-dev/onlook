import { beforeEach, describe, expect, it } from 'bun:test';
import { generate, parse } from 'css-tree';
import { CssStyleChange } from '../electron/preload/webview/changes/index.ts';

describe('CssStyleChange', () => {
    let cssChange;

    beforeEach(() => {
        cssChange = new CssStyleChange();
    });

    it('finding nodes by selector', () => {
        const ast = parse('.example { color: red } \n .example1 { color: blue }');
        const node1 = cssChange.find(ast, '.example')[0];
        const node2 = cssChange.find(ast, '.example1')[0];
        expect(generate(node1)).toBe('.example { color: red }'.replace(/\s/g, ''));
        expect(generate(node2)).toBe('.example1 { color: blue }'.replace(/\s/g, ''));
    });

    it('Add rule', () => {
        const ast = parse('');
        cssChange.addRule(ast, '.example', 'color', 'blue');
        expect(generate(ast)).toBe('.example { color: blue }'.replace(/\s/g, ''));
    });

    it('Update rule', () => {
        const ast = parse('.example { color: red }');
        const node = cssChange.find(ast, '.example')[0];
        cssChange.updateRule(node, 'color', 'blue');
        expect(generate(ast)).toBe('.example { color: blue }'.replace(/\s/g, ''));
    });
});
