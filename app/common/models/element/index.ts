interface BaseDomElement {
    selector: string;
    rect: DOMRect;
    encodedTemplateNode?: string;
    uuid: string;
}

export interface DomElement extends BaseDomElement {
    tagName: string;
    styles: Record<string, string>;
    parent?: ParentDomElement;
}

export interface TextDomElement extends DomElement {
    textContent: string;
}

export interface ParentDomElement extends BaseDomElement {}

export interface WebViewElement extends DomElement {
    webviewId: string;
}

export interface ElementPosition {
    x: number;
    y: number;
}
