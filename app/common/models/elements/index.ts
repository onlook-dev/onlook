// DOM
export interface DomElement {
    selector: string;
    rect: DOMRect;
    styles: CSSStyleDeclaration;
    encodedTemplateNode?: string;
    parent?: ParentDomElement;
}

export interface ParentDomElement {
    selector: string;
    rect: DOMRect;
    encodedTemplateNode?: string;
}

// Engine
export interface ElementMetadata {
    selector: string;
    rect: DOMRect;
    parentRect: DOMRect;
    computedStyle: CSSStyleDeclaration;
    webviewId: string;
    dataOnlookId?: string;
    tagName: string;
}
