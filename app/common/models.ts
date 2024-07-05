
export interface ElementMetadata {
    tagName: string;
    selector: string;
    rect: DOMRect;
    parentRect: DOMRect;
    computedStyle: CSSStyleDeclaration;
    webviewId: string;
    dataOnlookId?: string;
}

export interface WriteStyleParams {
    selector: string;
    templateNode: TemplateNode;
    tailwind: string;
}

export interface TemplateTagPosition {
    line: number;
    column: number;
}

export interface TemplateTag {
    start: TemplateTagPosition
    end: TemplateTagPosition
}

export interface TemplateNode {
    path: string,
    startTag: TemplateTag,
    endTag: TemplateTag,
    commit: string,
}

export interface CodeResult {
    original: string;
    generated: string;
    param: WriteStyleParams;
}

export interface TunnelResult {
    url: string;
    password: string;
}
