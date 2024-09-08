export interface LayerNode {
    id: string;
    textContent: string;
    type: number;
    tagName: string;
    style: {
        display: string;
        flexDirection: string;
    };
    children?: LayerNode[];
    originalIndex: number;
}

export interface WebviewLayerNode {
    id: string;
    textContent: string;
    tagName: string;
    encodedTemplateNode?: string | null;
    children?: WebviewLayerNode[];
    element?: HTMLElement;
}
