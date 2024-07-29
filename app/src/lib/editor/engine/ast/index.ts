import { TemplateNode } from '/common/models/element/templateNode';

export interface AstNode {
    selector: string;
    component: string;
    instanceTemplate?: TemplateNode;
    rootTemplate?: TemplateNode;
    children: AstNode[];
}

export interface CodeNode {}

export class AstManager {
    components: Map<string, AstNode> = new Map();

    // TODO: Get code AST from main using Babel
    getCodeAst(templateNode: TemplateNode): CodeNode {
        return {};
    }

    // TODO: Get DOM tree filtered by Component.
    getFiltedDomTree(component: string, domNode: Element): Element {
        return {};
    }

    travel(codeNode: CodeNode, domNode: Element): AstNode {
        return {
            selector: '',
            component: '',
            instanceTemplate: undefined,
            rootTemplate: undefined,
            children: [],
        };
    }
}
