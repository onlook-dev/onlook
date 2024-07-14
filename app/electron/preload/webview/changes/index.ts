// @ts-expect-error - No external dependencies for webview preload
import { CssNode, Declaration, Rule, generate, parse, walk } from './csstree.esm.js';
import { EditorAttributes } from '/common/constants';

export class CssStyleChange {
    private get stylesheet(): CssNode {
        const styleElement: HTMLStyleElement = (document.getElementById(
            EditorAttributes.ONLOOK_STYLESHEET_ID,
        ) || this.createStylesheet()) as HTMLStyleElement;
        styleElement.textContent = styleElement.textContent || '';
        return parse(styleElement.textContent);
    }

    private set stylesheet(ast: CssNode) {
        const styleElement: HTMLStyleElement = (document.getElementById(
            EditorAttributes.ONLOOK_STYLESHEET_ID,
        ) || this.createStylesheet()) as HTMLStyleElement;
        styleElement.textContent = generate(ast);
    }

    private createStylesheet(): HTMLStyleElement {
        const styleElement = document.createElement('style');
        styleElement.id = EditorAttributes.ONLOOK_STYLESHEET_ID;
        document.head.appendChild(styleElement);
        return styleElement;
    }

    clearStyleSheet() {
        this.stylesheet = parse('');
    }

    find(ast: CssNode, selectorToFind: string) {
        const matchingNodes: CssNode[] = [];
        walk(ast, {
            visit: 'Rule',
            enter: (node: CssNode) => {
                if (node.prelude.type === 'SelectorList') {
                    node.prelude.children.forEach((selector: string) => {
                        const selectorText = generate(selector);
                        if (selectorText === selectorToFind) {
                            matchingNodes.push(node);
                        }
                    });
                }
            },
        });
        return matchingNodes;
    }

    public updateStyle(selector: string, jsStyle: string, value: string) {
        const property = this.jsToCssProperty(jsStyle);
        const ast = this.stylesheet;
        const matchingNodes = this.find(ast, selector);
        if (!matchingNodes.length) {
            this.addRule(ast, selector, property, value);
        } else {
            matchingNodes.forEach((node) => {
                if (node.type === 'Rule') {
                    this.updateRule(node, property, value);
                }
            });
        }
        this.stylesheet = ast;
    }

    addRule(ast: CssNode, selector: string, property: string, value: string) {
        const newRule: Rule = {
            type: 'Rule',
            prelude: {
                type: 'SelectorList',
                children: [
                    {
                        type: 'Selector',
                        children: [
                            {
                                type: 'TypeSelector',
                                name: selector,
                            },
                        ],
                    },
                ] as any,
            },
            block: {
                type: 'Block',
                children: [
                    {
                        type: 'Declaration',
                        property: property,
                        value: { type: 'Raw', value: value },
                    },
                ] as any,
            },
        };

        if (ast.type === 'StyleSheet') {
            ast.children.push(newRule);
        }
    }

    updateRule(rule: Rule, property: string, value: string) {
        let found = false;
        walk(rule.block, {
            visit: 'Declaration',
            enter: (decl: Declaration) => {
                if (decl.property === property) {
                    decl.value = { type: 'Raw', value: value };
                    if (value === '' || value === 'none') {
                        rule.block.children = rule.block.children.filter(
                            (decl: Declaration) => decl.property !== property,
                        );
                    }
                    found = true;
                }
            },
        });

        if (!found) {
            if (value === '' || value === 'none') {
                rule.block.children = rule.block.children.filter(
                    (decl: Declaration) => decl.property !== property,
                );
            } else {
                rule.block.children.push({
                    type: 'Declaration',
                    property: property,
                    value: { type: 'Raw', value: value },
                });
            }
        }
    }

    jsToCssProperty(key: string) {
        if (!key) {
            return '';
        }
        return key.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
}
