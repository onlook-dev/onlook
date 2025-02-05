import Parser from 'tree-sitter';
const TypeScript = require('tree-sitter-typescript');

type ErrorWithMessage = {
    message: string;
};

export interface TreeSitterOptions {
    includeComments?: boolean;
    parseServerComponents?: boolean;
}

export interface SerializedFunction {
    name: string;
    type: 'server' | 'client' | 'default';
    async?: boolean;
    params: Array<{ name: string; type?: string }>;
    returnType?: string;
    modifiers: string[];
    documentation?: string;
}

export class TreeSitterProcessor {
    private parser: Parser;

    constructor() {
        this.parser = new Parser();
        this.parser.setLanguage(TypeScript.tsx);
    }

    async parseNextCode(code: string, options: TreeSitterOptions = {}): Promise<Parser.Tree> {
        return this.parser.parse(code);
    }

    hasParseErrors(tree: Parser.Tree): boolean {
        const checkNode = (node: Parser.SyntaxNode): boolean => {
            if (node.type === 'ERROR') return true;
            return node.children.some(checkNode);
        };
        return checkNode(tree.rootNode);
    }

    async getASTForLLM(code: string, options: TreeSitterOptions = {}): Promise<object> {
        const tree = await this.parseNextCode(code, options);
        return this.transformTreeForLLM(tree.rootNode, 0, 100, options);
    }

    async getFunctionSignatures(
        code: string,
        options: TreeSitterOptions = {},
    ): Promise<SerializedFunction[]> {
        const tree = await this.parseNextCode(code, options);
        const functions: SerializedFunction[] = [];

        const processNode = (node: Parser.SyntaxNode) => {
            if (node.type === 'function_declaration' || node.type === 'arrow_function') {
                const func: SerializedFunction = {
                    name: '',
                    type: 'default',
                    params: [],
                    modifiers: [],
                };

                const nameNode = node.childForFieldName('name');
                if (nameNode) func.name = nameNode.text;

                const paramList = node.childForFieldName('parameters');
                if (paramList) {
                    paramList.children.forEach((param) => {
                        const paramName = param.childForFieldName('name')?.text;
                        const paramType = param.childForFieldName('type')?.text;
                        if (paramName) {
                            func.params.push({ name: paramName, type: paramType });
                        }
                    });
                }

                if (options.parseServerComponents && this.hasServerDirective(node)) {
                    func.type = 'server';
                } else if (this.hasClientDirective(node)) {
                    func.type = 'client';
                }

                functions.push(func);
            }

            node.children.forEach(processNode);
        };

        processNode(tree.rootNode);
        return functions;
    }

    private hasServerDirective(node: Parser.SyntaxNode): boolean {
        let current: Parser.SyntaxNode | null = node;
        while (current) {
            if (current.text.includes('use server')) return true;
            current = current.parent;
        }
        return false;
    }

    private hasClientDirective(node: Parser.SyntaxNode): boolean {
        let current: Parser.SyntaxNode | null = node;
        while (current) {
            if (current.text.includes('use client')) return true;
            current = current.parent;
        }
        return false;
    }

    serializeFunction(func: SerializedFunction): string {
        const modifiers = func.modifiers.length > 0 ? `[${func.modifiers.join(', ')}] ` : '';
        const asyncMod = func.async ? 'async ' : '';
        const params = func.params
            .map((p) => (p.type ? `${p.name}: ${p.type}` : p.name))
            .join(', ');
        const returnType = func.returnType ? ` -> ${func.returnType}` : '';
        const componentType = func.type !== 'default' ? `[${func.type}] ` : '';

        return `${componentType}${modifiers}${asyncMod}${func.name}(${params})${returnType}`;
    }

    private transformTreeForLLM(
        node: Parser.SyntaxNode,
        depth: number = 0,
        maxDepth: number = 100,
        options: TreeSitterOptions = {},
    ): object {
        const result: any = {
            type: node.type,
            text: node.text,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
        };

        if (options.parseServerComponents && node.text.includes('use server')) {
            result.isServerComponent = true;
        }

        if (depth < maxDepth && node.children.length > 0) {
            result.children = node.children.map((child) =>
                this.transformTreeForLLM(child, depth + 1, maxDepth, options),
            );
        }

        return result;
    }
}
