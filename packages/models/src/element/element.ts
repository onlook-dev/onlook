interface BaseDomElement {
    domId: string;
    frameId: string;
    oid: string | null;
    instanceId: string | null;
    rect: DOMRect;
}

export interface ParentDomElement extends BaseDomElement {}

export interface DomElement extends BaseDomElement {
    tagName: string;
    styles: DomElementStyles | null;
    parent: ParentDomElement | null;
}

export interface DomElementStyles {
    defined: Record<string, string>; // Styles from stylesheets or inline
    computed: Record<string, string>; // Browser computed styles
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

export interface RectDimensions {
    width: number;
    height: number;
    top: number;
    left: number;
}
