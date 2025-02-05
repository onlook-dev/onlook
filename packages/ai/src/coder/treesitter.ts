import Parser from 'tree-sitter';
const TypeScript = require('tree-sitter-typescript');

type ErrorWithMessage = {
    message: string;
};

export interface TreeSitterOptions {
    includeComments?: boolean;
    parseServerComponents?: boolean;
}

export class TreeSitterProcessor {
    private parser: Parser;

    constructor() {
        this.parser = new Parser();
        this.parser.setLanguage(TypeScript.tsx);
    }

    async parseNextCode(code: string, options: TreeSitterOptions = {}): Promise<Parser.Tree> {
        const tree = this.parser.parse(code);
        if (options.includeComments || options.parseServerComponents) {
            this.processNode(tree.rootNode, options);
        }
        return tree;
    }

    private processNode(node: Parser.SyntaxNode, options: TreeSitterOptions): void {
        if (options.includeComments && node.type === 'comment') {
            // Preserve comment nodes when includeComments is true
            return;
        }
        if (options.parseServerComponents && node.text.includes('use server')) {
            // Mark server component directives for special handling
            node.type = 'server_directive';
        }
        node.children.forEach((child) => this.processNode(child, options));
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
        return this.transformTreeForLLM(tree.rootNode);
    }

    private transformTreeForLLM(
        node: Parser.SyntaxNode,
        depth: number = 0,
        maxDepth: number = 100,
    ): object {
        const result: any = {
            type: node.type,
            text: node.text,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
        };

        if (depth < maxDepth && node.children.length > 0) {
            result.children = node.children.map((child) =>
                this.transformTreeForLLM(child, depth + 1, maxDepth),
            );
        }

        return result;
    }
}
