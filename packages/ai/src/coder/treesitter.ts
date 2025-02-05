import Parser from 'tree-sitter';
import { TypescriptLanguage } from 'tree-sitter-typescript';

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
        this.parser.setLanguage(TypescriptLanguage.tsx);
    }

    async parseNextCode(code: string, options: TreeSitterOptions = {}): Promise<Parser.Tree> {
        try {
            return this.parser.parse(code);
        } catch (error) {
            const err = error as ErrorWithMessage;
            throw new Error(`Failed to parse Next.js code: ${err.message}`);
        }
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
