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
        return this.transformTreeForLLM(tree.rootNode);
    }

    private transformTreeForLLM(node: Parser.SyntaxNode): object {
        return {
            type: node.type,
            text: node.text,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
            children: node.children.map((child) => this.transformTreeForLLM(child)),
        };
    }
}
