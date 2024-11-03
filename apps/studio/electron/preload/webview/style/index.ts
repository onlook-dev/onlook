import type { CssNode, Declaration, Rule } from 'css-tree';
import { cssTree } from '../bundles/';
import { EditorAttributes } from '@onlook/models/constants';

class CSSManager {
    private static instance: CSSManager;
    private constructor() {}
    public static getInstance(): CSSManager {
        if (!CSSManager.instance) {
            CSSManager.instance = new CSSManager();
        }
        return CSSManager.instance;
    }

    private get stylesheet(): CssNode {
        const styleElement: HTMLStyleElement = (document.getElementById(
            EditorAttributes.ONLOOK_STYLESHEET_ID,
        ) || this.createStylesheet()) as HTMLStyleElement;
        styleElement.textContent = styleElement.textContent || '';
        return cssTree.parse(styleElement.textContent);
    }

    private set stylesheet(ast: CssNode) {
        const styleElement: HTMLStyleElement = (document.getElementById(
            EditorAttributes.ONLOOK_STYLESHEET_ID,
        ) || this.createStylesheet()) as HTMLStyleElement;
        styleElement.textContent = cssTree.generate(ast);
    }

    private createStylesheet(): HTMLStyleElement {
        const styleElement = document.createElement('style');
        styleElement.id = EditorAttributes.ONLOOK_STYLESHEET_ID;
        document.head.appendChild(styleElement);
        return styleElement;
    }

    clearStyleSheet() {
        this.stylesheet = cssTree.parse('');
    }

    find(ast: CssNode, selectorToFind: string) {
        const matchingNodes: CssNode[] = [];
        cssTree.walk(ast, {
            visit: 'Rule',
            enter: (node: CssNode) => {
                // @ts-expect-error - Type mismatch
                if (node.prelude.type === 'SelectorList') {
                    // @ts-expect-error - Type mismatch
                    node.prelude.children.forEach((selector: string) => {
                        const selectorText = cssTree.generate(selector);
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
        cssTree.walk(rule.block, {
            visit: 'Declaration',
            enter: (decl: Declaration) => {
                if (decl.property === property) {
                    decl.value = { type: 'Raw', value: value };
                    if (value === '') {
                        rule.block.children = rule.block.children.filter(
                            // @ts-expect-error - Type mismatch
                            (decl: Declaration) => decl.property !== property,
                        );
                    }
                    found = true;
                }
            },
        });

        if (!found) {
            if (value === '') {
                rule.block.children = rule.block.children.filter(
                    // @ts-expect-error - Type mismatch
                    (decl: Declaration) => decl.property !== property,
                );
            } else {
                // @ts-expect-error - Type mismatch
                rule.block.children.push({
                    type: 'Declaration',
                    property: property,
                    value: { type: 'Raw', value: value },
                });
            }
        }
    }

    getJsStyle(selector: string): Record<string, string> {
        const ast = this.stylesheet;
        const matchingNodes = this.find(ast, selector);
        const styles: Record<string, string> = {};
        if (!matchingNodes.length) {
            return styles;
        }
        matchingNodes.forEach((node) => {
            if (node.type === 'Rule') {
                cssTree.walk(node, {
                    visit: 'Declaration',
                    enter: (decl: Declaration) => {
                        // @ts-expect-error - Type mismatch
                        styles[this.cssToJsProperty(decl.property)] = decl.value.value;
                    },
                });
            }
        });
        return styles;
    }

    jsToCssProperty(key: string) {
        if (!key) {
            return '';
        }
        return key.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    cssToJsProperty(key: string) {
        if (!key) {
            return '';
        }
        return key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
}

export const cssManager = CSSManager.getInstance();
