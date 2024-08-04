interface BaseDomElement {
    selector: string;
    rect: DOMRect;
    encodedTemplateNode?: string;
}

export interface DomElement extends BaseDomElement {
    tagName: string;
    styles: Record<string, string>;
    parent?: ParentDomElement;
}

export interface ParentDomElement extends BaseDomElement {}

export interface WebViewElement extends DomElement {
    webviewId: string;
}
