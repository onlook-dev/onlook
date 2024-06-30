export interface ElementMetadata {
    tagName: string;
    selector: string;
    rect: DOMRect;
    computedStyle: CSSStyleDeclaration;
    webviewId: string;
    dataOnlookId?: string;
}