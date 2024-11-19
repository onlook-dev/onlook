import { EditorAttributes } from '@onlook/models/constants';
import type { CssNode, Declaration, Raw, Rule, SelectorList } from 'css-tree';
import { cssTree } from '../bundles/';
import { selectorFromDomId } from '/common/helpers';

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

    clear() {
        this.stylesheet = cssTree.parse('');
    }

    find(ast: CssNode, selectorToFind: string) {
        const matchingNodes: CssNode[] = [];
        cssTree.walk(ast, {
            visit: 'Rule',
            enter: (node: CssNode) => {
                if (node.type === 'Rule') {
                    const rule = node as Rule;
                    if (rule.prelude.type === 'SelectorList') {
                        (rule.prelude as SelectorList).children.forEach((selector) => {
                            const selectorText = cssTree.generate(selector);
                            if (selectorText === selectorToFind) {
                                matchingNodes.push(node);
                            }
                        });
                    }
                }
            },
        });
        return matchingNodes;
    }

    public updateStyle(domId: string, jsStyle: string, value: string) {
        const selector = selectorFromDomId(domId, false);
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
                            (decl: CssNode) => (decl as Declaration).property !== property,
                        );
                    }
                    found = true;
                }
            },
        });

        if (!found) {
            if (value === '') {
                rule.block.children = rule.block.children.filter(
                    (decl: CssNode) => (decl as Declaration).property !== property,
                );
            } else {
                rule.block.children.push({
                    type: 'Declaration',
                    property: property,
                    value: { type: 'Raw', value: value },
                    important: false,
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
                        styles[this.cssToJsProperty(decl.property)] = (decl.value as Raw).value;
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

export default CSSManager.getInstance();
