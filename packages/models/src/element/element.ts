interface BaseDomElement {
    domId: string;
    webviewId: string;
    oid: string | null;
    instanceId: string | null;
    rect: DOMRect;
}

export interface ParentDomElement extends BaseDomElement {}

export interface DomElement extends BaseDomElement {
    tagName: string;
    styles: {
        defined: Record<string, string>; // Styles from stylesheets or inline
        computed: Record<string, string>; // Browser computed styles
    } | null;
    parent: ParentDomElement | null;
}

export interface ElementPosition {
    x: number;
    y: number;
}

export interface DropElementProperties {
    tagName: string;
    styles: Record<string, string>;
    textContent: string | null;
}
